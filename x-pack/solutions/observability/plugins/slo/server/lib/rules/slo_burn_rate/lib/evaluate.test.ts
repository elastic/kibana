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
import { evaluate } from './evaluate';

const EMPTY_AGG_RESPONSE = {
  aggregations: {
    instances: {
      buckets: [],
    },
  },
};

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
});
