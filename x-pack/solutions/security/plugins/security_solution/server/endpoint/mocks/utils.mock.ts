/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { OpenPointInTimeResponse, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidV4 } from 'uuid';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { fromKueryExpression } from '@kbn/es-query';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { getFlattenedObject } from '@kbn/std';
import { isObject, merge, reduce } from 'lodash';

interface ApplyEsClientSearchMockOptions<TDocument = unknown> {
  esClientMock: ElasticsearchClientMock;
  /**
   * The index to intercept and return the response provided. If providing an index value that
   * ends with `*` (an index pattern), the search request will be checked to see if any of the
   * defined indexes "start with" the index pattern defined (note: only supports a `*` at the
   * end of the index name)
   */
  index: string;
  response: SearchResponse<TDocument>;
  /**
   * Mock is to be used only when search is using ES's Point-in-Time
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

  esClientMock.openPointInTime.mockImplementation(async (...args) => {
    const options = args[0];

    if (options.index === index) {
      const pitResponse = { id: `mock:pit:${index}:${uuidV4()}` };
      openedPitIds.add(pitResponse.id);

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

    if (params.index && !pitUsage && indexListHasMatchForIndex(searchReqIndexes, index)) {
      return response;
    } else if (pit && pitUsage && openedPitIds.has(pit.id)) {
      return response;
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
export const getPackagePolicyInfoFromFleetKuery = (kuery: string): FleetKueryInfo => {
  const response: FleetKueryInfo = {
    packageNames: [],
    agentPolicyIds: [],
  };

  const kueryAst = fromKueryExpression(kuery);
  const kueryFlatten = flattenKeys(kueryAst);

  getFlattenedObject(kueryAst);

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
