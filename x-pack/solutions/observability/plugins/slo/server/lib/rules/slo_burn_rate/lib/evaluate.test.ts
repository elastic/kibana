/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createKQLCustomIndicator, createSLO } from '../../../../services/fixtures/slo';
import { createBurnRateRule } from '../fixtures/rule';
import type { EvaluationAfterKey } from './build_query';
import { INSTANCES_PAGE_SIZE } from './build_query';
import type { EvaluationBucket } from './evaluate';
import { evaluate } from './evaluate';

const EMPTY_AGG_RESPONSE = {
  aggregations: {
    instances: {
      buckets: [],
    },
  },
};

const aggResponse = (
  buckets: Array<Omit<EvaluationBucket, 'groupings'>>,
  afterKey?: EvaluationAfterKey
) => ({ aggregations: { instances: { buckets, after_key: afterKey } } } as any);

const alertingBucket = (instanceId: string): Omit<EvaluationBucket, 'groupings'> => ({
  key: { instanceId },
  doc_count: 1,
  WINDOW_0_SHORT_BURN_RATE: { value: 20 },
  WINDOW_0_LONG_BURN_RATE: { value: 20 },
  WINDOW_0_SHORT_ABOVE_THRESHOLD: { value: 1 },
  WINDOW_0_LONG_ABOVE_THRESHOLD: { value: 1 },
});

const candidateBucket = (instanceId: string) => ({ key: { instanceId }, doc_count: 1 });

const instanceIdsFilter = (instanceIds: string[]) => ({
  terms: { 'slo.instanceId': instanceIds },
});

describe('evaluate', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(EMPTY_AGG_RESPONSE as any);
  });

  it('includes project_routing in the ES search when projectRouting is provided', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);

    await evaluate(esClient, slo, params, new Date(), '_alias:_origin');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:_origin' })
    );
  });

  it('omits project_routing from the ES search when projectRouting is not provided', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);

    await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledWith(
      expect.not.objectContaining({ project_routing: expect.anything() })
    );
  });

  it('evaluates only the instances with bad events in the longest short window', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);
    esClient.search
      .mockResolvedValueOnce(
        aggResponse([candidateBucket('instance-a'), candidateBucket('instance-b')], {
          instanceId: 'instance-b',
        })
      )
      .mockResolvedValueOnce(aggResponse([]))
      .mockResolvedValueOnce(aggResponse([alertingBucket('instance-a')]));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search.mock.calls[2][0]).toMatchObject({
      query: {
        bool: { filter: expect.arrayContaining([instanceIdsFilter(['instance-a', 'instance-b'])]) },
      },
    });
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['instance-a']);
  });

  it('skips the evaluation query when no instance has bad events', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(results).toEqual([]);
  });

  it('evaluates the candidate instances in batches of one page', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);
    const instanceIds = Array.from({ length: INSTANCES_PAGE_SIZE + 1 }, (_, i) => `instance-${i}`);
    esClient.search.mockResolvedValueOnce(aggResponse(instanceIds.map(candidateBucket)));

    await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search.mock.calls[1][0]).toMatchObject({
      query: {
        bool: { filter: expect.arrayContaining([instanceIdsFilter(instanceIds.slice(0, -1))]) },
      },
    });
    expect(esClient.search.mock.calls[2][0]).toMatchObject({
      query: {
        bool: { filter: expect.arrayContaining([instanceIdsFilter(instanceIds.slice(-1))]) },
      },
    });
  });

  it('keeps paging the evaluation past pages without alerting instances', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);
    esClient.search
      .mockResolvedValueOnce(aggResponse([candidateBucket('page-2-alerting')]))
      .mockResolvedValueOnce(aggResponse([], { instanceId: 'page-1-last' }))
      .mockResolvedValueOnce(aggResponse([alertingBucket('page-2-alerting')]));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search.mock.calls[2][0]).toMatchObject({
      aggs: { instances: { composite: { after: { instanceId: 'page-1-last' } } } },
    });
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['page-2-alerting']);
  });
});
