/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchRelationshipSourceInventory, summarizeEntityDoc } from './gap_data';
import { createTestContext } from './test_helpers';

describe('summarizeEntityDoc', () => {
  it('reads nested documents', () => {
    expect(
      summarizeEntityDoc({
        entity: {
          id: 'user:alice',
          relationships: {
            accesses_frequently: { ids: ['host:a'] },
            resolution: { resolved_to: 'user:golden' },
          },
        },
        asset: { criticality: 'high_impact' },
      })
    ).toEqual({
      euid: 'user:alice',
      hasRelationships: true,
      relationshipTargets: ['host:a'],
      resolvedTo: 'user:golden',
      criticality: 'high_impact',
    });
  });

  it('reads flat dotted fields and arrays', () => {
    expect(
      summarizeEntityDoc({
        'entity.id': ['host:b'],
        'entity.relationships.owns.ids': ['user:x'],
      })
    ).toEqual({ euid: 'host:b', hasRelationships: true, relationshipTargets: ['user:x'] });
  });

  it('does not count resolution or empty relationship arrays as relationships', () => {
    expect(
      summarizeEntityDoc({
        entity: {
          id: 'host:c',
          relationships: { resolution: { resolved_to: 'host:g' }, owns: { ids: [] } },
        },
      })
    ).toEqual({ euid: 'host:c', hasRelationships: false, resolvedTo: 'host:g' });
  });

  it('ignores documents without an entity id', () => {
    expect(summarizeEntityDoc({ foo: 'bar' })).toBeUndefined();
  });
});

describe('fetchRelationshipSourceInventory', () => {
  it('maps data stream backing indices to source ids', async () => {
    const ctx = createTestContext();
    ctx.esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 3, successful: 3, skipped: 0, failed: 0 },
      hits: { total: { value: 10, relation: 'eq' }, hits: [] },
      aggregations: {
        indices: {
          buckets: [
            { key: '.ds-logs-system.auth-default-2026.10.01-000001', doc_count: 5 },
            { key: '.ds-logs-entityanalytics_okta.user-default-2026.10.01-000001', doc_count: 5 },
          ],
        },
      },
    });
    const present = await fetchRelationshipSourceInventory(ctx);
    expect([...present].sort()).toEqual(['okta', 'system_auth']);
  });
});
