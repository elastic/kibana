/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createKQLCustomIndicator, createSLO } from '../../../../services/fixtures/slo';
import { createBurnRateRule } from '../fixtures/rule';
import { MAX_EVALUATION_RESULTS } from '../constants';
import { buildEvaluationFilter, buildEvaluationQuery } from './build_query';
import { evaluate, findBreachingInstances } from './evaluate';

const COLUMNS = [
  { name: 'instance_id', type: 'keyword' },
  { name: 'window_index', type: 'integer' },
  { name: 'short_window_burn_rate', type: 'double' },
  { name: 'long_window_burn_rate', type: 'double' },
];

const esqlResponse = (
  values: Array<[string, number, number, number]>
): estypes.EsqlQueryResponse => ({
  columns: COLUMNS,
  values,
});

const groupingsResponse = (
  hits: Array<{ instanceId: string; groupings: Record<string, unknown> }>
): estypes.SearchResponse => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: hits.map(({ instanceId, groupings }) => ({
      _index: '.slo-observability.sli-v3',
      _id: instanceId,
      _source: { slo: { instanceId, groupings } },
    })),
  },
});

describe('evaluate', () => {
  let esClient: ElasticsearchClientMock;
  const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
  const params = createBurnRateRule(slo);

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(esqlResponse([]));
  });

  it('returns the breaching instances with the burn rates of their breaching window', async () => {
    esClient.esql.query.mockResolvedValueOnce(
      esqlResponse([
        ['host-a', 0, 20, 15],
        ['host-b', 3, 1.2, 1.1],
      ])
    );
    esClient.search.mockResolvedValueOnce(
      groupingsResponse([
        { instanceId: 'host-a', groupings: { host: { name: 'host-a' } } },
        { instanceId: 'host-b', groupings: { host: { name: 'host-b' } } },
      ])
    );

    const results = await evaluate(esClient, slo, params, new Date());

    expect(results).toEqual([
      expect.objectContaining({
        instanceId: 'host-a',
        shouldAlert: true,
        shortWindowBurnRate: 20,
        longWindowBurnRate: 15,
        window: params.windows[0],
        groupings: { host: { name: 'host-a' } },
      }),
      expect.objectContaining({
        instanceId: 'host-b',
        shouldAlert: true,
        shortWindowBurnRate: 1.2,
        longWindowBurnRate: 1.1,
        window: params.windows[3],
        groupings: { host: { name: 'host-b' } },
      }),
    ]);
    expect(results[1].shortWindowDuration.format()).toBe('360m');
    expect(results[1].longWindowDuration.format()).toBe('72h');
  });

  it('only looks up the groupings of the breaching instances, within the evaluation filter', async () => {
    const startedAt = new Date('2023-01-01T00:00:00.000Z');
    esClient.esql.query.mockResolvedValueOnce(esqlResponse([['host-a', 0, 20, 15]]));
    esClient.search.mockResolvedValueOnce(groupingsResponse([]));

    await evaluate(esClient, slo, params, startedAt);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 1,
        collapse: { field: 'slo.instanceId' },
        query: {
          bool: {
            filter: [
              buildEvaluationFilter(startedAt, slo, params),
              { terms: { 'slo.instanceId': ['host-a'] } },
            ],
          },
        },
      })
    );
  });

  it('runs the evaluation query with its params and the SLO revision filter', async () => {
    const startedAt = new Date('2023-01-01T00:00:00.000Z');

    await findBreachingInstances(esClient, slo, params, startedAt, { limit: 10 });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      buildEvaluationQuery(startedAt, slo, params, 10)
    );
  });

  it('reads the result columns by name', async () => {
    esClient.esql.query.mockResolvedValueOnce({
      columns: [COLUMNS[3], COLUMNS[2], COLUMNS[1], COLUMNS[0]],
      values: [[15, 20, 1, 'host-a']],
    });

    const [instance] = await findBreachingInstances(esClient, slo, params, new Date());

    expect(instance).toEqual(
      expect.objectContaining({
        instanceId: 'host-a',
        shortWindowBurnRate: 20,
        longWindowBurnRate: 15,
        window: params.windows[1],
      })
    );
  });

  it('throws when the evaluation returns an unknown window', async () => {
    esClient.esql.query.mockResolvedValueOnce(
      esqlResponse([['host-a', params.windows.length, 20, 15]])
    );

    await expect(findBreachingInstances(esClient, slo, params, new Date())).rejects.toThrow(
      'Evaluation query for host-a failed.'
    );
  });

  it('leaves the groupings undefined when none are found for an instance', async () => {
    esClient.esql.query.mockResolvedValueOnce(
      esqlResponse([
        ['host-a', 0, 20, 15],
        ['host-b', 0, 18, 16],
      ])
    );
    esClient.search.mockResolvedValueOnce(
      groupingsResponse([{ instanceId: 'host-a', groupings: { host: { name: 'host-a' } } }])
    );

    const results = await evaluate(esClient, slo, params, new Date());

    expect(results.map(({ instanceId, groupings }) => ({ instanceId, groupings }))).toEqual([
      { instanceId: 'host-a', groupings: { host: { name: 'host-a' } } },
      { instanceId: 'host-b', groupings: undefined },
    ]);
  });

  it('does not look up groupings when no instance is breaching', async () => {
    const results = await evaluate(esClient, slo, params, new Date());

    expect(results).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('does not query when there are no windows', async () => {
    const results = await evaluate(esClient, slo, { ...params, windows: [] }, new Date());

    expect(results).toEqual([]);
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('runs a single ES|QL query bounded by the limit', async () => {
    await findBreachingInstances(esClient, slo, params, new Date(), { limit: 1001 });

    expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query.mock.calls[0][0].query).toMatch(/\| LIMIT 1001$/);
  });

  it('caps the limit to the maximum ES|QL result size', async () => {
    await findBreachingInstances(esClient, slo, params, new Date(), { limit: 50_000 });

    expect(esClient.esql.query.mock.calls[0][0].query).toMatch(
      new RegExp(`\\| LIMIT ${MAX_EVALUATION_RESULTS}$`)
    );
  });

  it('defaults the limit to the maximum ES|QL result size', async () => {
    await findBreachingInstances(esClient, slo, params, new Date());

    expect(esClient.esql.query.mock.calls[0][0].query).toMatch(
      new RegExp(`\\| LIMIT ${MAX_EVALUATION_RESULTS}$`)
    );
  });

  it('requests at least one result', async () => {
    await findBreachingInstances(esClient, slo, params, new Date(), { limit: 0 });

    expect(esClient.esql.query.mock.calls[0][0].query).toMatch(/\| LIMIT 1$/);
  });

  it('includes project_routing in both queries when projectRouting is provided', async () => {
    esClient.esql.query.mockResolvedValueOnce(esqlResponse([['host-a', 0, 20, 15]]));
    esClient.search.mockResolvedValueOnce(groupingsResponse([]));

    await evaluate(esClient, slo, params, new Date(), { projectRouting: '_alias:_origin' });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:_origin' })
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:_origin' })
    );
  });

  it('omits project_routing from both queries when projectRouting is not provided', async () => {
    esClient.esql.query.mockResolvedValueOnce(esqlResponse([['host-a', 0, 20, 15]]));
    esClient.search.mockResolvedValueOnce(groupingsResponse([]));

    await evaluate(esClient, slo, params, new Date());

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.not.objectContaining({ project_routing: expect.anything() })
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.not.objectContaining({ project_routing: expect.anything() })
    );
  });
});
