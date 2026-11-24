/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { range } from 'lodash';
import { createKQLCustomIndicator, createSLO } from '../../../../services/fixtures/slo';
import { createBurnRateRule } from '../fixtures/rule';
import type { EvaluationAfterKey } from './build_query';
import { buildCandidatesQuery, buildQuery, EVALUATION_PAGE_SIZE } from './build_query';
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

    const results = await evaluate(esClient, slo, params, STARTED_AT);

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
  });

  it('does not evaluate when there is no candidate', async () => {
    esClient.search.mockResolvedValueOnce(candidatesResponse([]));

    const results = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });

  it('pages through the candidates until there is no after key, including empty pages', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse([], { instanceId: 'host-a' }))
      .mockResolvedValueOnce(candidatesResponse(['host-b'], { instanceId: 'host-b' }))
      .mockResolvedValueOnce(candidatesResponse([]))
      .mockResolvedValueOnce(evaluationResponse(['host-b']));

    const results = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search.mock.calls.map(([request]) => request)).toEqual([
      expect.objectContaining(buildCandidatesQuery(STARTED_AT, slo, params)),
      expect.objectContaining(
        buildCandidatesQuery(STARTED_AT, slo, params, { instanceId: 'host-a' })
      ),
      expect.objectContaining(
        buildCandidatesQuery(STARTED_AT, slo, params, { instanceId: 'host-b' })
      ),
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, ['host-b'])),
    ]);
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-b']);
  });

  it('evaluates each chunk of candidates in a single query, ignoring its after key', async () => {
    const candidateIds = range(EVALUATION_PAGE_SIZE + 1).map((index) => `host-${index}`);
    const firstCandidateId = candidateIds[0];
    const lastCandidateId = candidateIds[EVALUATION_PAGE_SIZE];
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(candidateIds))
      .mockResolvedValueOnce(
        evaluationResponse([firstCandidateId], { instanceId: firstCandidateId })
      )
      .mockResolvedValueOnce(
        evaluationResponse([lastCandidateId], { instanceId: lastCandidateId })
      );

    const results = await evaluate(esClient, slo, params, STARTED_AT);

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining(
        buildQuery(STARTED_AT, slo, params, undefined, candidateIds.slice(0, EVALUATION_PAGE_SIZE))
      )
    );
    expect(esClient.search).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining(buildQuery(STARTED_AT, slo, params, undefined, [lastCandidateId]))
    );
    expect(results.map(({ instanceId }) => instanceId)).toEqual([
      firstCandidateId,
      lastCandidateId,
    ]);
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

      const results = await evaluate(esClient, slo, paramsWithThreshold, STARTED_AT);

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

    const results = await evaluate(esClient, slo, params, STARTED_AT);

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
    ['candidates', params, []],
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
    const results = await evaluate(esClient, slo, { ...params, windows: [] }, STARTED_AT);

    expect(results).toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it.each([
    ['includes', '_alias:_origin', expect.objectContaining({ project_routing: '_alias:_origin' })],
    ['omits', undefined, expect.not.objectContaining({ project_routing: expect.anything() })],
  ])('%s project_routing in every ES search', async (_, projectRouting, expected) => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a']))
      .mockResolvedValueOnce(evaluationResponse([]));

    await evaluate(esClient, slo, params, STARTED_AT, projectRouting);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(1, expected);
    expect(esClient.search).toHaveBeenNthCalledWith(2, expected);
  });
});
