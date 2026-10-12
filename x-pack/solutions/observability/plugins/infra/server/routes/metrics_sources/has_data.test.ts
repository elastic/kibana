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
 * These exercise the production `getHasData` directly with a mocked metrics
 * client, so removing the second phase or the inconclusive-response warning
 * fails these tests.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { TIMESTAMP_FIELD } from '../../../common/constants';
import { getHasData, HAS_DATA_RECENT_WINDOW } from './has_data';

const makeHitsResponse = (
  total: number,
  opts: Partial<{
    timed_out: boolean;
    shardsFailed: number;
    clustersSkipped: number;
    clustersFailed: number;
  }> = {}
): estypes.SearchResponse =>
  ({
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
  } as unknown as estypes.SearchResponse);

/** A metrics client whose `search` returns the given responses in order. */
const createClient = (...responses: estypes.SearchResponse[]) => {
  const search = jest.fn();
  responses.forEach((response) => search.mockResolvedValueOnce(response));
  return { client: { search } as any, search };
};

/** Minimal logger stub; only `warn` is asserted on. */
const createLogger = () => ({ warn: jest.fn() } as unknown as Logger & { warn: jest.Mock });

describe('getHasData', () => {
  let logger: Logger & { warn: jest.Mock };

  beforeEach(() => {
    logger = createLogger();
  });

  describe('phase 1 — fast path', () => {
    it('returns hasData and skips phase 2 entirely when recent data exists', async () => {
      const { client, search } = createClient(makeHitsResponse(1));

      await expect(
        getHasData({ infraMetricsClient: client, source: 'all', logger })
      ).resolves.toEqual({
        hasData: true,
      });
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('bounds phase 1 by the rounded recent window and excludes cold/frozen tiers', async () => {
      const { client, search } = createClient(makeHitsResponse(1));

      await getHasData({ infraMetricsClient: client, source: 'all', logger });

      const { query, requestTimeout, track_total_hits: trackTotalHits } = search.mock.calls[0][0];
      expect(query.bool.filter).toEqual(
        expect.arrayContaining([
          { range: { [TIMESTAMP_FIELD]: { gte: HAS_DATA_RECENT_WINDOW } } },
          { bool: { must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }] } },
        ])
      );
      // Rounded date math is what makes the result shard-request-cache eligible.
      expect(HAS_DATA_RECENT_WINDOW).toBe('now-24h/h');
      expect(requestTimeout).toEqual(expect.any(String));
      expect(trackTotalHits).toBe(1);
    });
  });

  describe('phase 2 — exact fallback', () => {
    it('runs unbounded and reports data when phase 1 misses old or cold-tier data', async () => {
      const { client, search } = createClient(makeHitsResponse(0), makeHitsResponse(1));

      await expect(
        getHasData({ infraMetricsClient: client, source: 'all', logger })
      ).resolves.toEqual({
        hasData: true,
      });
      expect(search).toHaveBeenCalledTimes(2);

      // Phase 2 must not carry the range or tier restriction, or it would miss
      // exactly the dormant/cold data it exists to find.
      const phase2Query = search.mock.calls[1][0].query;
      expect(phase2Query.bool.filter).toBeUndefined();
      expect(JSON.stringify(phase2Query)).not.toContain(TIMESTAMP_FIELD);
      expect(JSON.stringify(phase2Query)).not.toContain('_tier');
    });

    it('reports no data when both phases come back empty and complete', async () => {
      const { client } = createClient(makeHitsResponse(0), makeHitsResponse(0));

      await expect(
        getHasData({ infraMetricsClient: client, source: 'all', logger })
      ).resolves.toEqual({
        hasData: false,
      });
    });
  });

  describe('CCS inconclusive-response reporting', () => {
    it.each([
      ['timed_out', { timed_out: true }],
      ['shard failures', { shardsFailed: 1 }],
      ['skipped CCS clusters', { clustersSkipped: 1 }],
      ['failed CCS clusters', { clustersFailed: 1 }],
    ])('still reports no data but warns on %s', async (_label, opts) => {
      const { client } = createClient(makeHitsResponse(0), makeHitsResponse(0, opts));

      // Returning `false` is deliberate — erroring here would be a behaviour
      // change. The warning is what makes the false-negative rate measurable.
      await expect(
        getHasData({ infraMetricsClient: client, source: 'all', logger })
      ).resolves.toEqual({ hasData: false });
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('logs the signals and counts so the rate can be aggregated', async () => {
      const { client } = createClient(
        makeHitsResponse(0),
        makeHitsResponse(0, { clustersSkipped: 2, shardsFailed: 3 })
      );

      await getHasData({ infraMetricsClient: client, source: 'all', logger });

      const [message] = logger.warn.mock.calls[0];
      expect(message).toContain('shards_failed=3');
      expect(message).toContain('clusters_skipped=2');
    });

    it('does not warn when an incomplete phase 2 still found a hit', async () => {
      // A positive hit conclusively proves data exists, so a partial CCS
      // outage is not worth reporting.
      const { client } = createClient(
        makeHitsResponse(0),
        makeHitsResponse(1, { clustersSkipped: 1, shardsFailed: 1 })
      );

      await expect(
        getHasData({ infraMetricsClient: client, source: 'all', logger })
      ).resolves.toEqual({ hasData: true });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not warn for a complete zero-hit response', async () => {
      const { client } = createClient(makeHitsResponse(0), makeHitsResponse(0));

      const hasDataResponse = await getHasData({
        infraMetricsClient: client,
        source: 'all',
        logger,
      });

      expect(hasDataResponse).toEqual({ hasData: false });
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('source parameter', () => {
    it('matches host-specific clauses for source=host', async () => {
      const { client, search } = createClient(makeHitsResponse(1));

      await getHasData({ infraMetricsClient: client, source: 'host', logger });

      const should = search.mock.calls[0][0].query.bool.should;
      expect(should.length).toBeGreaterThan(0);
      expect(JSON.stringify(should)).toContain('system');
    });

    it('matches all entity types for source=all', async () => {
      const { client, search } = createClient(makeHitsResponse(1));

      await getHasData({ infraMetricsClient: client, source: 'all', logger });

      // One exists clause per supported entity type.
      expect(search.mock.calls[0][0].query.bool.should).toHaveLength(7);
    });

    it('produces no entity clauses when source is omitted', async () => {
      // Pre-existing behaviour: with no clauses and minimum_should_match: 1 the
      // query matches nothing, so the answer is always false. Documented here
      // so a future change to it is deliberate rather than accidental.
      const { client, search } = createClient(makeHitsResponse(0), makeHitsResponse(0));

      await expect(
        getHasData({ infraMetricsClient: client, source: undefined, logger })
      ).resolves.toEqual({
        hasData: false,
      });
      expect(search.mock.calls[0][0].query.bool.should).toEqual([]);
      expect(search.mock.calls[0][0].query.bool.minimum_should_match).toBe(1);
    });
  });
});
