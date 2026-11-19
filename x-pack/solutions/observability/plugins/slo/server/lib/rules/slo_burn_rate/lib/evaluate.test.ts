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
import { EVALUATION_PAGE_SIZE } from './build_query';
import type { EvaluationBucket } from './evaluate';
import { evaluate } from './evaluate';

const searchResponse = (
  buckets: Array<Pick<EvaluationBucket, 'key'>>,
  afterKey?: EvaluationAfterKey
): estypes.SearchResponse<undefined, Record<string, estypes.AggregationsAggregate>> => ({
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

const withInstanceIds = (instanceIds: string[]) =>
  expect.objectContaining({
    query: {
      bool: { filter: expect.arrayContaining([{ terms: { 'slo.instanceId': instanceIds } }]) },
    },
  });

const withAfterKey = (instanceId: string) =>
  expect.objectContaining({
    aggs: {
      instances: expect.objectContaining({
        composite: expect.objectContaining({ after: { instanceId } }),
      }),
    },
  });

describe('evaluate', () => {
  const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
  const params = createBurnRateRule(slo);
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('only evaluates the instances with bad events in the short windows', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(['host-a', 'host-b']))
      .mockResolvedValueOnce(evaluationResponse(['host-b']));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(2, withInstanceIds(['host-a', 'host-b']));
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

  it('does not evaluate when no instance has bad events in the short windows', async () => {
    esClient.search.mockResolvedValueOnce(candidatesResponse([]));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });

  it('pages through the candidates until there is no after key, including empty pages', async () => {
    esClient.search
      .mockResolvedValueOnce(candidatesResponse([], { instanceId: 'host-a' }))
      .mockResolvedValueOnce(candidatesResponse(['host-b'], { instanceId: 'host-b' }))
      .mockResolvedValueOnce(candidatesResponse([]))
      .mockResolvedValueOnce(evaluationResponse(['host-b']));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(4);
    expect(esClient.search).toHaveBeenNthCalledWith(2, withAfterKey('host-a'));
    expect(esClient.search).toHaveBeenNthCalledWith(3, withAfterKey('host-b'));
    expect(esClient.search).toHaveBeenNthCalledWith(4, withInstanceIds(['host-b']));
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-b']);
  });

  it('evaluates the candidates by chunks fitting a single page', async () => {
    const candidateIds = range(EVALUATION_PAGE_SIZE + 1).map((index) => `host-${index}`);
    const lastCandidateId = candidateIds[EVALUATION_PAGE_SIZE];
    esClient.search
      .mockResolvedValueOnce(candidatesResponse(candidateIds))
      .mockResolvedValueOnce(evaluationResponse([]))
      .mockResolvedValueOnce(evaluationResponse([lastCandidateId]));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      withInstanceIds(candidateIds.slice(0, EVALUATION_PAGE_SIZE))
    );
    expect(esClient.search).toHaveBeenNthCalledWith(3, withInstanceIds([lastCandidateId]));
    expect(results.map(({ instanceId }) => instanceId)).toEqual([lastCandidateId]);
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

      const results = await evaluate(esClient, slo, paramsWithThreshold, new Date());

      expect(esClient.search).toHaveBeenCalledTimes(3);
      expect(esClient.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          query: {
            bool: { filter: expect.not.arrayContaining([{ terms: expect.anything() }]) },
          },
        })
      );
      expect(esClient.search).toHaveBeenNthCalledWith(2, withAfterKey('host-a'));
      expect(results.map(({ instanceId }) => instanceId)).toEqual(['host-b']);
    }
  );

  it('does not query when there are no windows', async () => {
    const results = await evaluate(esClient, slo, { ...params, windows: [] }, new Date());

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

    await evaluate(esClient, slo, params, new Date(), projectRouting);

    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(1, expected);
    expect(esClient.search).toHaveBeenNthCalledWith(2, expected);
  });
});
