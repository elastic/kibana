/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fetchAttackDiscoveryTactics,
  reduceAttackDiscoveryTactics,
} from './attack_discovery_tactics';
import { createTestContext, createTestLookup } from './test_helpers';

describe('reduceAttackDiscoveryTactics', () => {
  it('aliases v18 names to ids and merges with v19 names', () => {
    const byTactic = reduceAttackDiscoveryTactics(
      [
        { key: 'Defense Evasion', doc_count: 2 },
        { key: 'Stealth', doc_count: 1 },
        { key: 'Execution', doc_count: 4 },
        { key: 'TA0008', doc_count: 1 },
        { key: 'unknown tactic', doc_count: 7 },
      ],
      createTestLookup()
    );
    expect(Object.fromEntries(byTactic)).toEqual({ TA0005: 3, TA0002: 4, TA0008: 1 });
  });
});

describe('fetchAttackDiscoveryTactics', () => {
  it('queries both AD index patterns', async () => {
    const ctx = createTestContext();
    ctx.esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
      hits: { total: { value: 1, relation: 'eq' }, hits: [] },
      aggregations: { tactics: { buckets: [{ key: 'Lateral Movement', doc_count: 1 }] } },
    });
    const result = await fetchAttackDiscoveryTactics(ctx, createTestLookup());
    const [params] = ctx.esClient.search.mock.calls[0];
    expect(params).toMatchObject({
      index: [
        '.alerts-security.attack.discovery.alerts-default',
        '.adhoc.alerts-security.attack.discovery.alerts-default',
      ],
      ignore_unavailable: true,
    });
    expect(result.indexExists).toBe(true);
    expect(result.byTactic.get('TA0008')).toBe(1);
  });

  it('reports a missing index without throwing', async () => {
    const ctx = createTestContext();
    ctx.esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });
    const result = await fetchAttackDiscoveryTactics(ctx, createTestLookup());
    expect(result).toEqual({ indexExists: false, byTactic: new Map() });
  });
});
