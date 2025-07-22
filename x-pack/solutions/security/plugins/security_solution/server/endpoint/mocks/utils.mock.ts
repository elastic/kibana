/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type {
  OpenPointInTimeResponse,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidV4 } from 'uuid';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { isObject, merge, reduce } from 'lodash';
import { EndpointError } from '../../../common/endpoint/errors';

interface ApplyEsClientSearchMockOptions<TDocument = unknown> {
  esClientMock: ElasticsearchClientMock;
  /**
   * The index to intercept and return the response provided. If providing an index value that
   * ends with `*` (an index pattern), the search request will be checked to see if any of the
   * defined indexes "start with" the index pattern defined (note: only supports a `*` at the
   * end of the index name)
   */
  index: string;
  response:
    | SearchResponse<TDocument>
    | ((searchRequest: SearchRequest) => SearchResponse<TDocument>);
  /**
   * Mock is to be used only when search is using ES's Point-in-Time.
   */
  pitUsage?: boolean;
}

const indexListHasMatchForIndex = (indexList: string[], indexNameOrPattern: string): boolean => {
  const startsWithValue: string | undefined = indexNameOrPattern.endsWith('*')
    ? indexNameOrPattern.substring(0, indexNameOrPattern.length - 1)
    : '';

  return indexList.some((index) => {
    return index === indexNameOrPattern || (startsWithValue && index.startsWith(startsWithValue));
  });
};

/**
 * Generic utility for applying mocks to ES Client mock search method. Any existing mock implementation
 * for the `.search()` method will be called if the mock being applied does not match the target
 * index, thus this utility can be chained on top of other already applied mock implementations.
 *
 * This utility also handles search requests using Point In Time.
 */
export const applyEsClientSearchMock = <TDocument = unknown>({
  esClientMock,
  index,
  response,
  pitUsage,
}: ApplyEsClientSearchMockOptions<TDocument>) => {
  const priorSearchMockImplementation = esClientMock.search.getMockImplementation();
  const priorOpenPointInTimeImplementation = esClientMock.openPointInTime.getMockImplementation();
  const priorClosePointInTimeImplementation = esClientMock.closePointInTime.getMockImplementation();
  const openedPitIds = new Set<string>();
  const maxPitCalls = 50;
  const pitCallCount: Record<string, number> = {};

  esClientMock.openPointInTime.mockImplementation(async (...args) => {
    const options = args[0];

    if (options.index === index) {
      const pitResponse = { id: `mock:pit:${index}:${uuidV4()}` };
      openedPitIds.add(pitResponse.id);
      pitCallCount[pitResponse.id] = 0;

      return pitResponse as OpenPointInTimeResponse;
    }

    if (priorOpenPointInTimeImplementation) {
      return priorOpenPointInTimeImplementation(...args);
    }

    return { id: 'mock' } as OpenPointInTimeResponse;
  });

  esClientMock.closePointInTime.mockImplementation(async (...args) => {
    const closePitResponse = { succeeded: true, num_freed: 1 };
    const options = args[0];
    const pitId = options.id;

    if (pitId) {
      if (openedPitIds.has(pitId)) {
        openedPitIds.delete(pitId);
        return closePitResponse;
      }
    }

    if (priorClosePointInTimeImplementation) {
      return priorClosePointInTimeImplementation(options);
    }

    return closePitResponse;
  });

  esClientMock.search.mockImplementation(async (...args) => {
    const params = args[0] ?? {};
    const searchReqIndexes = Array.isArray(params.index) ? params.index : [params.index!];
    const pit = 'pit' in params ? params.pit : undefined;

    if (
      (params.index && !pitUsage && indexListHasMatchForIndex(searchReqIndexes, index)) ||
      (pit && pitUsage && openedPitIds.has(pit.id))
    ) {
      const searchResponse = typeof response === 'function' ? response(params) : response;

      if (pitUsage) {
        const mockPitId = pit?.id ?? '';
        searchResponse.pit_id = searchResponse.pit_id ?? mockPitId;

        if (Object.hasOwn(pitCallCount, mockPitId)) {
          pitCallCount[mockPitId]++;

          if (pitCallCount[mockPitId] > maxPitCalls) {
            throw new EndpointError(`applyEsClientSearchMock: Possible infinite loop detected!
'esClient.search()' method mock for index [${index}], which was setup with 'pitUsage: true', was called over [${maxPitCalls}] times indicating a possible infinite loop.
If mock is being used to supply results to the AsyncIterable returned by the 'createEsSearchIterable()' utility, it should be configured so that it returns an empty set of search results when there is no more data to be provided.
Example:

    applyEsClientSearchMock({
      esClientMock: esClientMock,
      index: 'index_name',
      pitUsage: true,
      response: jest
        // Mock function with default response of an empty set of results
        .fn(() => BaseDataGenerator.toEsSearchResponse([]))
        // Override the default response once with a result set for your test
        .mockReturnValueOnce(BaseDataGenerator.toEsSearchResponse([...your_search_hits...])),
    });

`);
          }
        }
      }

      return searchResponse;
    }

    if (priorSearchMockImplementation) {
      return priorSearchMockImplementation(...args);
    }

    return BaseDataGenerator.toEsSearchResponse([]);
  });
};

interface FleetKueryInfo {
  packageNames: string[];
  agentPolicyIds: string[];
}

/**
 * Parses a Fleet `kuery` string pass to the Package Policy service methods and returns info. about that kuery.
 * Helpful to create more reusable mocks for testing.
 * @param kuery
 */
export const getPackagePolicyInfoFromFleetKuery = async (
  kuery: string
): Promise<FleetKueryInfo> => {
  const response: FleetKueryInfo = {
    packageNames: [],
    agentPolicyIds: [],
  };

  // Why is a dynamic import being used below for `kueryAst`?
  // There is a module (`grammar`) used by this ES Query utility that does not load correctly
  // when cypress is ran (unclear why). The error seen when this occurs is below. The work-around
  // seems to be to use dynamic import.
  // Error:
  // ```
  // Your configFile is invalid: /opt/buildkite-agent/.../kibana/x-pack/solutions/security/plugins/security_solution/public/management/cypress/cypress_serverless.config.ts
  // It threw an error when required, check the stack trace below:
  // /opt/buildkite-agent/.../kibana/src/platform/packages/shared/kbn-es-query/src/kuery/grammar/grammar.peggy:20
  //   = Space* query:OrQuery? trailing:OptionalSpace {
  //                 ^
  // SyntaxError: Unexpected token ':'
  //     at wrapSafe (node:internal/modules/cjs/loader:1378:20)
  //     at Module._compile (node:internal/modules/cjs/loader:1428:41)
  //     at Module._extensions..js (node:internal/modules/cjs/loader:1548:10)
  //     at Object.require.extensions.<computed> [as .js] (/opt/buildkite-agent/.cache/Cypress/13.17.0/Cypress/resources/app/node_modules/ts-node/dist/index.js:851:20)..
  // ```

  const kueryAst = (await import('@kbn/es-query')).fromKueryExpression(kuery);
  const kueryFlatten = flattenKeys(kueryAst);
  const getNextKueryAstArgumentPath = (keyPath: string): string => {
    const lastIndexOfPackageNameArguments =
      keyPath.lastIndexOf('.arguments.') + '.arguments.'.length - 1;
    const nextArgumentNumber = Number(keyPath.charAt(lastIndexOfPackageNameArguments + 1)) + 1;

    return `${keyPath.substring(0, lastIndexOfPackageNameArguments)}.${nextArgumentNumber}.value`;
  };

  for (const [key, value] of Object.entries(kueryFlatten)) {
    if (value && typeof value === 'string') {
      if (value.includes(`${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name`)) {
        const packageName = kueryFlatten[getNextKueryAstArgumentPath(key)];

        if (packageName) {
          response.packageNames.push(packageName);
        }
      } else if (value.includes(`${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_ids`)) {
        const policyId = kueryFlatten[getNextKueryAstArgumentPath(key)];

        if (policyId) {
          response.agentPolicyIds.push(policyId);
        }
      }
    }
  }

  return response;
};

export const flattenKeys = (obj: any, keyPath: any[] = []): any => {
  // Copy taken from:
  // https://github.com/elastic/kibana/blob/6a7c904f921434fe21dfa00eceabfb5e64e915dc/src/platform/packages/private/kbn-telemetry-tools/src/tools/utils.ts#L252-L264
  // Because it is not exposed from that library
  if (isObject(obj)) {
    return reduce(
      obj,
      (cum, next, key) => {
        const keys = [...keyPath, key];
        return merge(cum, flattenKeys(next, keys));
      },
      {}
    );
  }
  return { [keyPath.join('.')]: obj };
};
