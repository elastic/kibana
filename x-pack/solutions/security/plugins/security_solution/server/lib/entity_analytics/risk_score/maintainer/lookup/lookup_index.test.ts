/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ensureLookupIndex } from './lookup_index';

const FULL_LOOKUP_PROPERTIES = {
  entity_id: { type: 'keyword' },
  resolution_target_id: { type: 'keyword' },
  propagation_target_id: { type: 'keyword' },
  relationship_type: { type: 'keyword' },
  calculation_run_id: { type: 'keyword' },
  '@timestamp': { type: 'date' },
};

describe('lookup index utilities', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
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
        mappings: { properties: FULL_LOOKUP_PROPERTIES },
      })
    );
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
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

  // Future-proofs the upgrade path: every field in `LOOKUP_INDEX_MAPPING` is
  // pushed to ES on every run. Adding a new field to the mapping should not
  // require any change here. ES handles "is this a no-op or a new field?"
  // and rejects conflicting type changes.
  it('applies the full mapping when the index already exists', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(true);

    await ensureLookupIndex({
      esClient,
      namespace: 'default',
    });

    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(esClient.indices.putMapping).toHaveBeenCalledWith({
      index: '.entity_analytics.risk_score.lookup-default',
      properties: FULL_LOOKUP_PROPERTIES,
    });
  });
});
