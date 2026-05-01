/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ensureLookupIndex } from './lookup_index';

describe('lookup index utilities', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    (esClient.indices.exists as jest.Mock).mockResolvedValue(true);
    (esClient.indices.getMapping as jest.Mock).mockResolvedValue({
      '.entity_analytics.risk_score.lookup-default': {
        mappings: {
          properties: {
            calculation_run_id: { type: 'keyword' },
          },
        },
      },
    });
  });

  it('creates lookup index with expected mapping when missing', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(false);

    const index = await ensureLookupIndex({
      esClient,
      namespace: 'default',
    });

    expect(index).toBe('.entity_analytics.risk_score.lookup-default');
    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.entity_analytics.risk_score.lookup-default',
        settings: { 'index.mode': 'lookup' },
        mappings: {
          properties: {
            entity_id: { type: 'keyword' },
            resolution_target_id: { type: 'keyword' },
            propagation_target_id: { type: 'keyword' },
            relationship_type: { type: 'keyword' },
            calculation_run_id: { type: 'keyword' },
            '@timestamp': { type: 'date' },
          },
        },
      })
    );
  });

  it('ignores resource_already_exists_exception during concurrent create', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(false);
    (esClient.indices.create as jest.Mock).mockRejectedValue(
      new Error('resource_already_exists_exception')
    );

    const index = await ensureLookupIndex({
      esClient,
      namespace: 'default',
    });

    expect(index).toBe('.entity_analytics.risk_score.lookup-default');
  });

  it('upgrades calculation_run_id mapping when missing', async () => {
    (esClient.indices.getMapping as jest.Mock).mockResolvedValue({
      '.entity_analytics.risk_score.lookup-default': {
        mappings: {
          properties: {
            entity_id: { type: 'keyword' },
          },
        },
      },
    });

    await ensureLookupIndex({
      esClient,
      namespace: 'default',
    });

    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: '.entity_analytics.risk_score.lookup-default',
      properties: {
        calculation_run_id: { type: 'keyword' },
      },
    });
  });
});
