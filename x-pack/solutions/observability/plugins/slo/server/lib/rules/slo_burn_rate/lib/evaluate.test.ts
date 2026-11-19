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

  it('keeps paging past pages without alerting instances until there is no after_key', async () => {
    const slo = createSLO({ id: 'irrelevant', indicator: createKQLCustomIndicator() });
    const params = createBurnRateRule(slo);
    esClient.search
      .mockResolvedValueOnce(aggResponse([], { instanceId: 'page-1-last' }))
      .mockResolvedValueOnce(
        aggResponse([alertingBucket('page-2-alerting')], { instanceId: 'page-2-last' })
      )
      .mockResolvedValueOnce(aggResponse([]));

    const results = await evaluate(esClient, slo, params, new Date());

    expect(esClient.search).toHaveBeenCalledTimes(3);
    expect(esClient.search.mock.calls[1][0]).toMatchObject({
      aggs: { instances: { composite: { after: { instanceId: 'page-1-last' } } } },
    });
    expect(results.map(({ instanceId }) => instanceId)).toEqual(['page-2-alerting']);
  });
});
