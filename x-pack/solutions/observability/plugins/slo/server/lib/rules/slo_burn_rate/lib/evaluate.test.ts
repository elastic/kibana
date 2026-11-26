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
import type { EvaluationAfterKey } from './build_query';
import { buildCandidatesQuery, buildQuery } from './build_query';
import type { EvaluationBucket } from './evaluate';
import { evaluate } from './evaluate';

const STARTED_AT = new Date('2023-01-01T00:00:00.000Z');

const searchResponse = (
  buckets: Array<Pick<EvaluationBucket, 'key'>>,
  afterKey?: EvaluationAfterKey
): estypes.SearchResponse<undefined> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { hits: [] },
  aggregations: { instances: { buckets, after_key: afterKey } },
});

const candidatesResponse = (instanceIds: string[], afterKey?: EvaluationAfterKey) =>
  searchResponse(
    instanceIds.map((instanceId) => ({ key: { instanceId } })),
    afterKey
  );

const breachingBucket = (instanceId: string): EvaluationBucket => ({
  key: { instanceId },
  doc_count: 10,
  groupings: {
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, failed: 0 },
    hits: { hits: [{ _index: 'sli', _source: { slo: { groupings: { host: instanceId } } } }] },
  },
  WINDOW_0_SHORT_BURN_RATE: { value: 20 },
  WINDOW_0_LONG_BURN_RATE: { value: 15 },
  WINDOW_0_SHORT_ABOVE_THRESHOLD: { value: 1 },
  WINDOW_0_LONG_ABOVE_THRESHOLD: { value: 1 },
});

const evaluationResponse = (instanceIds: string[], afterKey?: EvaluationAfterKey) =>
  searchResponse(instanceIds.map(breachingBucket), afterKey);

describe('evaluate', () => {
  const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
  const params = createBurnRateRule(slo);
  const paramsWithNonPositiveThreshold = {
    ...params,
    windows: [params.windows[0], { ...params.windows[1], burnRateThreshold: 0 }],
  };
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('evaluates the instances returned by the candidates query', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a', 'host-b']))
      .mockResolvedValueOnce(evaluationResponse(['host-b']));

    const { results, hasReachedLimit } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining(buildCandidatesQuery(STARTED_AT, slo, params))
    );
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, ['host-a', 'host-b']))
    );
    expect(results).toEqual([
      expect.objectContaining({
        instanceId: 'host-b',
        shouldAlert: true,
        shortWindowBurnRate: 20,
        longWindowBurnRate: 15,
        window: params.windows[0],
        groupings: { host: 'host-b' },
      }),
    ]);
    expect(hasReachedLimit).toBe(false);
  });

  it('does not evaluate when there is no candidate', async () => {
    esClient.search.mockResolvedValueOnce(candidatesResponse([]));

    const { results } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });

  it('reads a candidates response trimmed of its aggregations as the last empty page', async () => {
    esClient.search.mockResolvedValueOnce({ ...candidatesResponse([]), aggregations: undefined });

    const { results, hasReachedLimit } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
    expect(hasReachedLimit).toBe(false);
  });

  it('keeps paging through a candidates response trimmed of its buckets', async () => {
    esClient.search
      .mockResolvedValueOnce({
        ...candidatesResponse([]),
        aggregations: { instances: { after_key: { instanceId: 'host-a' } } },
      })
      .mockResolvedValueOnce(candidatesResponse(['host-b']))
      .mockResolvedValueOnce(evaluationResponse(['host-b']));

    const { results } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search.mock.calls.map(([request]) => request)).toEqual([
      expect.objectContaining(buildCandidatesQuery(STARTED_AT, slo, params)),
      expect.objectContaining(
        buildCandidatesQuery(STARTED_AT, slo, params, { instanceId: 'host-a' })
      ),
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, ['host-b'])),
    ]);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-b']);
  });

  it('pages through the candidates until there is no after key, including empty pages', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse([], { instanceId: 'host-a' }))
      .mockResolvedValueOnce(candidatesResponse(['host-b'], { instanceId: 'host-b' }))
      .mockResolvedValueOnce(evaluationResponse(['host-b']))
      .mockResolvedValueOnce(candidatesResponse([]));

    const { results } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search.mock.calls.map(([request]) => request)).toEqual([
      expect.objectContaining(buildCandidatesQuery(STARTED_AT, slo, params)),
      expect.objectContaining(
        buildCandidatesQuery(STARTED_AT, slo, params, { instanceId: 'host-a' })
      ),
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, ['host-b'])),
      expect.objectContaining(
        buildCandidatesQuery(STARTED_AT, slo, params, { instanceId: 'host-b' })
      ),
    ]);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-b']);
  });

  it('evaluates each candidates page in a single query, ignoring its after key', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a', 'host-b'], { instanceId: 'host-b' }))
      .mockResolvedValueOnce(evaluationResponse(['host-a'], { instanceId: 'host-a' }))
      .mockResolvedValueOnce(candidatesResponse(['host-c']))
      .mockResolvedValueOnce(evaluationResponse(['host-c'], { instanceId: 'host-c' }));

    const { results } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search.mock.calls.map(([request]) => request)).toEqual([
      expect.objectContaining(buildCandidatesQuery(STARTED_AT, slo, params)),
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, ['host-a', 'host-b'])),
      expect.objectContaining(
        buildCandidatesQuery(STARTED_AT, slo, params, { instanceId: 'host-b' })
      ),
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, ['host-c'])),
    ]);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-a', 'host-c']);
  });

  it('stops evaluating the candidates once more instances than the max results breach', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a', 'host-b'], { instanceId: 'host-b' }))
      .mockResolvedValueOnce(evaluationResponse(['host-a', 'host-b']));

    const { results, hasReachedLimit } = await evaluate(esClient, slo, params, STARTED_AT, {
      maxResults: 1,
    });

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-a']);
    expect(hasReachedLimit).toBe(true);
  });

  it('does not reach the limit when exactly the max results breach', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a', 'host-b'], { instanceId: 'host-b' }))
      .mockResolvedValueOnce(evaluationResponse(['host-a']))
      .mockResolvedValueOnce(candidatesResponse([]));

    const { results, hasReachedLimit } = await evaluate(esClient, slo, params, STARTED_AT, {
      maxResults: 1,
    });

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-a']);
    expect(hasReachedLimit).toBe(false);
  });

  it('stops paging through every instance once more instances than the max results breach', async () => {
    esClient.search.mockResolvedValueOnce(
      evaluationResponse(['host-a', 'host-b'], { instanceId: 'host-b' })
    );

    const { results, hasReachedLimit } = await evaluate(
      esClient,
      slo,
      paramsWithNonPositiveThreshold,
      STARTED_AT,
      { maxResults: 1 }
    );

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-a']);
    expect(hasReachedLimit).toBe(true);
  });

  it.each([0, -1])(
    'pages through every instance when a burn rate threshold is %s, since instances without bad events can breach it',
    async (burnRateThreshold) => {
      const paramsWithThreshold = {
        ...params,
        windows: [params.windows[0], { ...params.windows[1], burnRateThreshold }],
      };
      esClient.search
        .mockResolvedValueOnce(evaluationResponse([], { instanceId: 'host-a' }))
        .mockResolvedValueOnce(evaluationResponse(['host-b'], { instanceId: 'host-b' }))
        .mockResolvedValueOnce(evaluationResponse([]));

      const { results } = await evaluate(esClient, slo, paramsWithThreshold, STARTED_AT);

      expect(esClient.search.mock.calls.map(([request]) => request)).toEqual([
        expect.objectContaining(buildQuery(STARTED_AT, slo, paramsWithThreshold)),
        expect.objectContaining(
          buildQuery(STARTED_AT, slo, paramsWithThreshold, { instanceId: 'host-a' })
        ),
        expect.objectContaining(
          buildQuery(STARTED_AT, slo, paramsWithThreshold, { instanceId: 'host-b' })
        ),
      ]);
      expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-b']);
    }
  );

  it('reports the first breaching window', async () => {
    const bothWindowsBreachingBucket: EvaluationBucket = {
      ...breachingBucket('host-a'),
      WINDOW_1_SHORT_BURN_RATE: { value: 8 },
      WINDOW_1_LONG_BURN_RATE: { value: 7 },
      WINDOW_1_SHORT_ABOVE_THRESHOLD: { value: 1 },
      WINDOW_1_LONG_ABOVE_THRESHOLD: { value: 1 },
    };
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a']))
      .mockResolvedValueOnce(searchResponse([bothWindowsBreachingBucket]));

    const { results } = await evaluate(esClient, slo, params, STARTED_AT);

    expect(results).toEqual([
      expect.objectContaining({ window: params.windows[0], shortWindowBurnRate: 20 }),
    ]);
  });

  it('throws when a returned instance breaches no window', async () => {
    const nonBreachingBucket: EvaluationBucket = {
      ...breachingBucket('host-a'),
      WINDOW_0_LONG_ABOVE_THRESHOLD: { value: 0 },
    };
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a']))
      .mockResolvedValueOnce(searchResponse([nonBreachingBucket]));

    await expect(evaluate(esClient, slo, params, STARTED_AT)).rejects.toThrow(
      'Evaluation query for host-a failed.'
    );
  });

  it.each([
    ['candidates evaluation', params, [candidatesResponse(['host-a'])]],
    ['full scan', paramsWithNonPositiveThreshold, []],
  ])(
    'throws when the %s query returns no aggregations',
    async (_, ruleParams, previousResponses) => {
      previousResponses.forEach((response) => esClient.search.mockResolvedValueOnce(response));
      esClient.search.mockResolvedValueOnce({ ...searchResponse([]), aggregations: undefined });

      await expect(evaluate(esClient, slo, ruleParams, STARTED_AT)).rejects.toThrow(
        'Elasticsearch query failed to return a valid aggregation'
      );
      expect(esClient.search).toHaveBeenCalledTimes(previousResponses.length + 1);
    }
  );

  it('does not query when there are no windows', async () => {
    const { results, hasReachedLimit } = await evaluate(
      esClient,
      slo,
      { ...params, windows: [] },
      STARTED_AT
    );

    expect(results).toEqual([]);
    expect(hasReachedLimit).toBe(false);
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
