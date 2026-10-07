/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createSLO } from '../../../../services/fixtures/slo';
import { getSloSummary } from './summary_repository';

describe('getSloSummary', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({ hits: { hits: [] } } as any);
  });

  it('includes project_routing in the search when projectRouting is provided', async () => {
    const slo = createSLO({ id: 'irrelevant' });

    await getSloSummary(esClient, slo, '*', '_alias:_origin');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ project_routing: '_alias:_origin' })
    );
  });

  it('omits project_routing from the search when projectRouting is not provided', async () => {
    const slo = createSLO({ id: 'irrelevant' });

    await getSloSummary(esClient, slo, '*');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.not.objectContaining({ project_routing: expect.anything() })
    );
  });
});
