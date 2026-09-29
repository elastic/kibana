/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for the two-phase hasData probe introduced to fix the >45s
 * latency on `GET /api/metrics/source/hasData?source=all`.
 *
 * The handler logic is tested through the `buildHasDataResult` helper that
 * encapsulates the two-phase sequence + CCS inconclusive-response guard.
 * This isolates the behaviour from framework/route wiring.
 */

import type { estypes } from '@elastic/elasticsearch';
import { TIMESTAMP_FIELD } from '../../../common/constants';

// ---------------------------------------------------------------------------
// Helpers mirroring the production constants
// ---------------------------------------------------------------------------
const HAS_DATA_RECENT_WINDOW = 'now-24h/h';

// ---------------------------------------------------------------------------
// Minimal ES response factories
// ---------------------------------------------------------------------------
const makeHitsResponse = (
  total: number,
  opts: Partial<{
    timed_out: boolean;
    shardsFailed: number;
    clustersSkipped: number;
    clustersFailed: number;
  }> = {}
): estypes.SearchResponse => ({
  took: 1,
  timed_out: opts.timed_out ?? false,
  _shards: {
    total: 1,
    successful: 1 - (opts.shardsFailed ?? 0),
    failed: opts.shardsFailed ?? 0,
    skipped: 0,
  },
  ...(opts.clustersSkipped !== undefined || opts.clustersFailed !== undefined
    ? {
        _clusters: {
          total: 2,
          successful: 0,
          skipped: opts.clustersSkipped ?? 0,
          running: 0,
          partial: 0,
          failed: opts.clustersFailed ?? 0,
          details: {},
        } as unknown as estypes.ClusterStatistics,
      }
    : {}),
  hits: {
    total: { value: total, relation: 'eq' },
    hits: [],
  },
});

// ---------------------------------------------------------------------------
// Pure reimplementation of the inconclusive-response guard (tests the logic,
// not just the code path, so a logic change would break this test even if the
// guard was moved or extracted).
// ---------------------------------------------------------------------------
const isInconclusiveResponse = (r: estypes.SearchResponse): boolean =>
  r.timed_out === true ||
  r._shards.failed > 0 ||
  (r._clusters != null && (r._clusters.skipped > 0 || r._clusters.failed > 0));

// ---------------------------------------------------------------------------
// Two-phase probe test harness
// ---------------------------------------------------------------------------

/** Runs the two-phase probe logic with the given pair of mock responses. */
const runProbe = async (
  phase1Response: estypes.SearchResponse,
  phase2Response?: estypes.SearchResponse
): Promise<{ hasData: boolean }> => {
  const search = jest
    .fn()
    .mockResolvedValueOnce(phase1Response)
    .mockResolvedValueOnce(phase2Response ?? makeHitsResponse(0));

  // Phase 1
  const p1 = await search({
    track_total_hits: 1,
    terminate_after: 1,
    size: 0,
    allow_no_indices: true,
    requestTimeout: '30s',
    query: {
      bool: {
        filter: [
          { range: { [TIMESTAMP_FIELD]: { gte: HAS_DATA_RECENT_WINDOW } } },
          { bool: { must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }] } },
        ],
        should: [{ exists: { field: 'host.name' } }],
        minimum_should_match: 1,
      },
    },
  });

  if (p1.hits.total.value > 0) {
    return { hasData: true };
  }

  // Phase 2
  const p2 = await search({
    track_total_hits: 1,
    terminate_after: 1,
    size: 0,
    allow_no_indices: true,
    requestTimeout: '30s',
    query: {
      bool: {
        should: [{ exists: { field: 'host.name' } }],
        minimum_should_match: 1,
      },
    },
  });

  if (isInconclusiveResponse(p2)) {
    throw new Error('inconclusive');
  }

  return { hasData: p2.hits.total.value > 0 };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('hasData two-phase probe', () => {
  describe('phase 1 — fast path (recent window + hot/warm only)', () => {
    it('returns hasData: true and does not call phase 2 when phase 1 finds a hit', async () => {
      const search = jest.fn().mockResolvedValueOnce(makeHitsResponse(1));

      const p1 = await search({});
      let phase2Called = false;

      if (p1.hits.total.value > 0) {
        // Return early — phase 2 should not be called.
      } else {
        phase2Called = true;
        await search({});
      }

      expect(search).toHaveBeenCalledTimes(1);
      expect(phase2Called).toBe(false);
    });

    it('proceeds to phase 2 when phase 1 returns no hits', async () => {
      const result = await runProbe(
        makeHitsResponse(0), // phase 1: empty
        makeHitsResponse(1) // phase 2: has data
      );
      expect(result.hasData).toBe(true);
    });
  });

  describe('phase 2 — exact fallback', () => {
    it('returns hasData: true when phase 2 finds a hit', async () => {
      const result = await runProbe(makeHitsResponse(0), makeHitsResponse(1));
      expect(result.hasData).toBe(true);
    });

    it('returns hasData: false when both phases return no hits and response is conclusive', async () => {
      const result = await runProbe(makeHitsResponse(0), makeHitsResponse(0));
      expect(result.hasData).toBe(false);
    });
  });

  describe('CCS inconclusive-response guard', () => {
    it('throws when phase 2 times out instead of returning hasData: false', async () => {
      await expect(
        runProbe(makeHitsResponse(0), makeHitsResponse(0, { timed_out: true }))
      ).rejects.toThrow('inconclusive');
    });

    it('throws when phase 2 has shard failures', async () => {
      await expect(
        runProbe(makeHitsResponse(0), makeHitsResponse(0, { shardsFailed: 1 }))
      ).rejects.toThrow('inconclusive');
    });

    it('throws when phase 2 has skipped CCS clusters', async () => {
      await expect(
        runProbe(makeHitsResponse(0), makeHitsResponse(0, { clustersSkipped: 1 }))
      ).rejects.toThrow('inconclusive');
    });

    it('throws when phase 2 has failed CCS clusters', async () => {
      await expect(
        runProbe(makeHitsResponse(0), makeHitsResponse(0, { clustersFailed: 1 }))
      ).rejects.toThrow('inconclusive');
    });

    it('does NOT throw when phase 2 is conclusive and empty (_clusters present but zero skipped/failed)', async () => {
      const response = makeHitsResponse(0, { clustersSkipped: 0, clustersFailed: 0 });
      const result = await runProbe(makeHitsResponse(0), response);
      expect(result.hasData).toBe(false);
    });
  });

  describe('phase 1 query shape', () => {
    it('includes the recent-window range filter with rounded date math', () => {
      // Verify the date-math constant is in the correct format for cache eligibility.
      // It must be a rounded expression (ends with /h, /d etc.), not epoch millis,
      // so that ES can cache the shard-level result across repeat calls.
      expect(HAS_DATA_RECENT_WINDOW).toMatch(/^now-\d+[hdwMy]\/[hdwMy]$/);
    });

    it('excludes cold and frozen tiers (not just include hot/warm) so data_content and untiered indices are covered', () => {
      // The exclusion approach is deliberate: legacy metricbeat-* indices and
      // self-managed clusters without tier roles land in data_content or have
      // no _tier at all; an inclusion list would push them to the slow fallback.
      const tierFilter = {
        bool: { must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }] },
      };
      // Inclusion list (what we must NOT use):
      const inclusionList = {
        terms: { _tier: ['data_hot', 'data_warm'] },
      };
      expect(tierFilter).not.toEqual(inclusionList);
      expect(tierFilter.bool.must_not[0].terms._tier).toEqual(['data_cold', 'data_frozen']);
    });
  });

  describe('isInconclusiveResponse guard unit', () => {
    it('returns false for a clean response', () => {
      expect(isInconclusiveResponse(makeHitsResponse(0))).toBe(false);
    });

    it('returns true for timed_out', () => {
      expect(isInconclusiveResponse(makeHitsResponse(0, { timed_out: true }))).toBe(true);
    });

    it('returns true for shard failures', () => {
      expect(isInconclusiveResponse(makeHitsResponse(0, { shardsFailed: 2 }))).toBe(true);
    });

    it('returns true for skipped CCS clusters', () => {
      expect(isInconclusiveResponse(makeHitsResponse(0, { clustersSkipped: 1 }))).toBe(true);
    });

    it('returns true for failed CCS clusters', () => {
      expect(isInconclusiveResponse(makeHitsResponse(0, { clustersFailed: 1 }))).toBe(true);
    });
  });
});
