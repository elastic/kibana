/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { huntResultSchema } from './hunt_result';

const baseResult = {
  has_confirmed_hit: true,
  hit_sources: ['tier1'] as Array<'tier1' | 'tier2'>,
  time_range: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
  tier1: {
    status: 'environment_hits_found' as const,
    counts: { total_hits: 10, returned_hits: 5, affected_hosts: 2, affected_users: 1 },
    per_index: [{ index: 'logs-endpoint.events.process-default', hit_count: 10, required: true }],
    resolved_iocs: [{ type: 'ip' as const, value: '203.0.113.5' }],
  },
};

describe('huntResultSchema', () => {
  it('accepts a result with per_ioc (including field) and searched_ioc_count', () => {
    const result = huntResultSchema.safeParse({
      ...baseResult,
      tier1: {
        ...baseResult.tier1,
        searched_ioc_count: 3,
        per_ioc: [
          {
            type: 'ip',
            value: '203.0.113.5',
            field: 'destination.ip',
            count: 8,
            host_count: 2,
            user_count: 1,
            first_seen: '2026-01-01T01:00:00.000Z',
            last_seen: '2026-01-01T12:00:00.000Z',
          },
        ],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier1.searched_ioc_count).toBe(3);
      expect(result.data.tier1.per_ioc?.[0].field).toBe('destination.ip');
    }
  });

  it('accepts a result without resolved_iocs', () => {
    const { resolved_iocs: _omit, ...tier1WithoutResolved } = baseResult.tier1;
    const result = huntResultSchema.safeParse({
      ...baseResult,
      tier1: {
        ...tier1WithoutResolved,
        searched_ioc_count: 1,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier1.resolved_iocs).toBeUndefined();
    }
  });

  it('rejects per_ioc with more than 30 entries', () => {
    const result = huntResultSchema.safeParse({
      ...baseResult,
      tier1: {
        ...baseResult.tier1,
        counts: { ...baseResult.tier1.counts, total_hits: 100 },
        per_index: [
          { index: 'logs-endpoint.events.process-default', hit_count: 100, required: true },
        ],
        per_ioc: Array.from({ length: 31 }, (_, i) => ({
          type: 'ip' as const,
          value: `203.0.113.${i}`,
          field: 'destination.ip',
          count: 1,
        })),
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects per_ioc[].count greater than total_hits', () => {
    const result = huntResultSchema.safeParse({
      ...baseResult,
      tier1: {
        ...baseResult.tier1,
        per_ioc: [
          {
            type: 'ip',
            value: '203.0.113.5',
            field: 'destination.ip',
            count: 11,
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts per_ioc[].count equal to total_hits', () => {
    const result = huntResultSchema.safeParse({
      ...baseResult,
      tier1: {
        ...baseResult.tier1,
        per_ioc: [
          {
            type: 'ip',
            value: '203.0.113.5',
            field: 'destination.ip',
            count: 10,
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });
});
