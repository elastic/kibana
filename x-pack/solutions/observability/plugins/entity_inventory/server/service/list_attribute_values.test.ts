/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityDefinitionsClient } from '@kbn/entity-store/server';
import { k8sDeploymentFixture, k8sNodeFixture } from '../inventory/__fixtures__/definitions';
import { InventoryRequestError } from '../inventory/errors/inventory_request_error';
import { InventoryTypeNotFoundError } from '../inventory/errors/inventory_type_not_found_error';
import type { ListAttributeValuesRequest } from '../inventory/types';
import { listAttributeValues } from './list_attribute_values';

type RegisteredDefinitions = Awaited<ReturnType<EntityDefinitionsClient['list']>>;

// The first source of `k8sDeploymentFixture` declares `cluster`, and the second declares `cluster`
// and `paused`, each from `orchestrator.cluster.name` and `kubernetes.deployment.paused`.
const KUBELET = 'metrics-kubeletstatsreceiver.otel-default';
const STATE = 'metrics-kubernetes.state_deployment-*';

const FIXTURE_SOURCES = k8sDeploymentFixture.dynamic?.sources ?? [];

// A copy of the fixture that suggests the given filters, and labels the values of `cluster` in its
// second source when `clusterLabels` is given. The fixture itself is never modified.
const deployment = (
  suggestedFilters: string[],
  type = 'k8s.deployment',
  clusterLabels?: Record<string, string>
): RegisteredDefinitions[number] => ({
  ...k8sDeploymentFixture,
  type,
  dynamic: {
    sources: FIXTURE_SOURCES.map((source, index) =>
      index === 1 && clusterLabels
        ? {
            ...source,
            attributes: source.attributes?.map((attribute) =>
              attribute.name === 'cluster'
                ? { ...attribute, valueLabels: clusterLabels }
                : attribute
            ),
          }
        : source
    ),
    suggestedFilters,
  },
});

const request = (
  overrides: Partial<ListAttributeValuesRequest> = {}
): ListAttributeValuesRequest => ({
  attribute: 'cluster',
  types: ['k8s.deployment'],
  selections: {},
  selected: [],
  window: { from: '2026-10-19T10:00:00.000Z', to: '2026-10-19T11:00:00.000Z' },
  limit: 100,
  ...overrides,
});

const createDependencies = (definitions: RegisteredDefinitions) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const getDynamicDefinition = jest.fn(async (type: string) => {
    const definition = definitions.find((candidate) => candidate.type === type);
    if (!definition) {
      throw new InventoryTypeNotFoundError(type, 'no entity definition is registered for it');
    }
    return definition;
  });
  return { dependencies: { getDynamicDefinition, esClient, logger }, esClient, logger };
};

type Answer = { values: Array<string | null>; isPartial?: boolean } | { throws: Error };

const isProbe = (query: string) => query.includes('| LIMIT 0');

// A probe answer: no time-series index behind the pattern, so every source runs one `FROM` plan.
const probeResponse = () => ({
  columns: [{ name: '@timestamp', type: 'null' }],
  values: [],
  is_partial: false,
  took: 1,
  documents_found: 0,
});

const valuesResponse = ({
  values,
  isPartial = false,
}: {
  values: Array<string | null>;
  isPartial?: boolean;
}) => ({
  columns: [{ name: 'value', type: 'keyword' }],
  values: values.map((value) => [value]),
  is_partial: isPartial,
  took: 3,
  documents_found: values.length,
});

// Answers each probe, and each values query by the index pattern it reads; a pattern without an
// answer returns no values, and a `{ throws }` answer is thrown as the client would.
const answerByPattern = (
  esClient: ReturnType<typeof createDependencies>['esClient'],
  answers: Record<string, Answer>
) => {
  esClient.esql.query.mockImplementation(async ({ query }) => {
    if (isProbe(query)) {
      return probeResponse();
    }
    const pattern = Object.keys(answers).find((candidate) => query.includes(candidate));
    const answer = pattern === undefined ? { values: [] } : answers[pattern];
    if ('throws' in answer) {
      throw answer.throws;
    }
    return valuesResponse(answer);
  });
};

const valuesQueries = (esClient: ReturnType<typeof createDependencies>['esClient']) =>
  esClient.esql.query.mock.calls.map(([body]) => body).filter(({ query }) => !isProbe(query));

describe('listAttributeValues', () => {
  describe('the values', () => {
    it('merges the values of every source into distinct sorted values', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, {
        [KUBELET]: { values: ['us', 'eu'] },
        [STATE]: { values: ['eu', 'staging'] },
      });

      const response = await listAttributeValues(dependencies, request());

      expect(response).toEqual({
        values: ['eu', 'staging', 'us'],
        invalidSelections: [],
        truncated: false,
        errors: [],
      });
    });

    it('reads the attribute from the field of each source', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['paused'])]);
      answerByPattern(esClient, { [STATE]: { values: ['false', 'true'] } });

      const response = await listAttributeValues(dependencies, request({ attribute: 'paused' }));

      // Only the second source declares `paused`, so the first one sends no query.
      expect(valuesQueries(esClient)).toHaveLength(1);
      expect(valuesQueries(esClient)[0].query).toContain(
        'TO_STRING(`kubernetes.deployment.paused`)'
      );
      expect(response.values).toEqual(['false', 'true']);
    });

    it('lists the values of an identity field', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['kubernetes.namespace'])]);
      answerByPattern(esClient, {
        [KUBELET]: { values: ['checkout'] },
        [STATE]: { values: ['checkout', 'default'] },
      });

      const response = await listAttributeValues(
        dependencies,
        request({ attribute: 'kubernetes.namespace' })
      );

      expect(valuesQueries(esClient)[0].query).toContain('TO_STRING(`kubernetes.namespace`)');
      expect(response.values).toEqual(['checkout', 'default']);
    });

    it('shows a value as its label, and a value without one as it is', async () => {
      const { dependencies, esClient } = createDependencies([
        deployment(['cluster'], 'k8s.deployment', { eu: 'Europe' }),
      ]);
      answerByPattern(esClient, {
        [KUBELET]: { values: ['eu'] },
        [STATE]: { values: ['eu', 'us'] },
      });

      const response = await listAttributeValues(dependencies, request());

      // The first source has no labels, so its `eu` stays as it is beside the labelled one.
      expect(response.values).toEqual(['Europe', 'eu', 'us']);
    });

    it('ignores empty values', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, { [KUBELET]: { values: [null, 'eu'] } });

      const response = await listAttributeValues(dependencies, request());

      expect(response.values).toEqual(['eu']);
    });
  });

  describe('the selections', () => {
    it('sends the other selections to every source that can match them', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['kubernetes.namespace'])]);
      answerByPattern(esClient, { [STATE]: { values: ['checkout'] } });

      await listAttributeValues(
        dependencies,
        request({ attribute: 'kubernetes.namespace', selections: { cluster: ['eu'] } })
      );

      expect(valuesQueries(esClient)).toHaveLength(2);
      valuesQueries(esClient).forEach(({ query, params }) => {
        expect(query).toContain('TO_STRING(`orchestrator.cluster.name`) IN (?a0v0)');
        expect(params).toContainEqual({ a0v0: 'eu' });
      });
    });

    it('sends no query to a source that cannot match them', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, { [STATE]: { values: ['eu'] } });

      await listAttributeValues(dependencies, request({ selections: { paused: ['true'] } }));

      // Only the second source declares `paused`.
      expect(valuesQueries(esClient)).toHaveLength(1);
      expect(valuesQueries(esClient)[0].query).toContain(STATE);
    });

    it('reports the selected values that are no longer offered', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, { [KUBELET]: { values: ['eu'] } });

      const response = await listAttributeValues(
        dependencies,
        request({ selected: ['eu', 'gone'] })
      );

      expect(response.invalidSelections).toEqual(['gone']);
    });
  });

  describe('the limit', () => {
    it('keeps the first values and says that the limit left others out', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, {
        [KUBELET]: { values: ['a', 'b'] },
        [STATE]: { values: ['c'] },
      });

      const response = await listAttributeValues(dependencies, request({ limit: 2 }));

      expect(response.values).toEqual(['a', 'b']);
      expect(response.truncated).toBe(true);
    });

    it('is not truncated when the values fit', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, { [KUBELET]: { values: ['a', 'b'] } });

      const response = await listAttributeValues(dependencies, request({ limit: 2 }));

      expect(response.truncated).toBe(false);
    });

    it('asks each source for one value more than the limit', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, {});

      await listAttributeValues(dependencies, request({ limit: 5 }));

      valuesQueries(esClient).forEach(({ query }) => expect(query).toContain('| LIMIT 6'));
    });
  });

  describe('the types in scope', () => {
    it('leaves out a type that does not suggest the attribute', async () => {
      const node = {
        ...k8sNodeFixture,
        dynamic: {
          sources: [
            {
              indexPattern: 'metrics-node-*',
              attributes: [{ name: 'cluster', field: 'orchestrator.cluster.name' }],
            },
          ],
        },
      };
      const { dependencies, esClient } = createDependencies([deployment(['cluster']), node]);
      answerByPattern(esClient, { [KUBELET]: { values: ['eu'] } });

      await listAttributeValues(dependencies, request({ types: ['k8s.deployment', node.type] }));

      expect(valuesQueries(esClient).every(({ query }) => !query.includes('metrics-node-*'))).toBe(
        true
      );
    });

    it('sends the same query once when two types share a source', async () => {
      const { dependencies, esClient } = createDependencies([
        deployment(['cluster']),
        deployment(['cluster'], 'k8s.deployment_copy'),
      ]);
      answerByPattern(esClient, { [KUBELET]: { values: ['eu'] } });

      await listAttributeValues(
        dependencies,
        request({ types: ['k8s.deployment', 'k8s.deployment_copy'] })
      );

      expect(valuesQueries(esClient)).toHaveLength(2);
    });

    it('counts a type listed twice once', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, {});

      await listAttributeValues(
        dependencies,
        request({ types: ['k8s.deployment', 'k8s.deployment'] })
      );

      expect(dependencies.getDynamicDefinition).toHaveBeenCalledTimes(1);
    });

    it('rejects a request when no type in scope suggests the attribute', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['kubernetes.namespace'])]);

      await expect(listAttributeValues(dependencies, request())).rejects.toThrow(
        InventoryRequestError
      );
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('rejects a type that is not registered', async () => {
      const { dependencies } = createDependencies([deployment(['cluster'])]);

      await expect(
        listAttributeValues(dependencies, request({ types: ['missing'] }))
      ).rejects.toThrow(InventoryTypeNotFoundError);
    });
  });

  describe('the sources that fail', () => {
    it('reports a failed source and keeps the values of the others', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, {
        [KUBELET]: { values: ['eu'] },
        [STATE]: { throws: new Error('shard failure') },
      });

      const response = await listAttributeValues(dependencies, request());

      expect(response.values).toEqual(['eu']);
      expect(response.errors).toEqual([
        expect.objectContaining({ indexPattern: STATE, reason: expect.stringContaining('shard') }),
      ]);
    });

    it('reports a partial answer and keeps its values', async () => {
      const { dependencies, esClient } = createDependencies([deployment(['cluster'])]);
      answerByPattern(esClient, { [KUBELET]: { values: ['eu'], isPartial: true } });

      const response = await listAttributeValues(dependencies, request());

      expect(response.values).toEqual(['eu']);
      expect(response.errors).toEqual([
        expect.objectContaining({
          indexPattern: KUBELET,
          reason: expect.stringContaining('partial'),
        }),
      ]);
    });
  });
});
