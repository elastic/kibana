/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unit tests for the two-phase probe behind
 * `GET /api/metrics/source/{sourceId}/hasData`.
 *
 * These exercise the production `hasData` directly with a mocked search client,
 * so removing the second phase or the inconclusive-response warning fails
 * these tests.
 */

import type { Logger } from '@kbn/logging';
import { hasData } from './has_data';
import { TIMESTAMP_FIELD } from '../../../common/constants';

const makeResponse = (
  total: number,
  opts: Partial<{
    timed_out: boolean;
    shardsFailed: number;
    clustersSkipped: number;
    clustersFailed: number;
  }> = {}
) =>
  ({
    took: 1,
    timed_out: opts.timed_out ?? false,
    _shards: {
      total: 1,
      successful: 1 - (opts.shardsFailed ?? 0),
      skipped: 0,
      failed: opts.shardsFailed ?? 0,
    },
    ...(opts.clustersSkipped !== undefined || opts.clustersFailed !== undefined
      ? {
          _clusters: {
            total: 2,
            successful: 0,
            skipped: opts.clustersSkipped ?? 0,
            failed: opts.clustersFailed ?? 0,
          },
        }
      : {}),
    hits: {
      total: { value: total, relation: 'eq' },
      hits: [],
    },
  } as any);

/** A search client that returns the given responses in order. */
const createClient = (...responses: unknown[]) => {
  const search = jest.fn();
  responses.forEach((response) => search.mockResolvedValueOnce(response));
  return { client: search as any, search };
};

const INDEX = 'metrics-*,metricbeat-*';

/** Minimal logger stub; only `warn` is asserted on. */
const createLogger = () => ({ warn: jest.fn() } as unknown as Logger & { warn: jest.Mock });

describe('hasData (metrics source probe)', () => {
  let logger: Logger & { warn: jest.Mock };

  beforeEach(() => {
    logger = createLogger();
  });

  describe('phase 1 — fast path', () => {
    it('returns true and skips phase 2 entirely when recent data exists', async () => {
      const { client, search } = createClient(makeResponse(1));

      await expect(hasData(INDEX, client, logger)).resolves.toBe(true);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('bounds phase 1 by the rounded recent window and excludes cold/frozen tiers', async () => {
      const { client, search } = createClient(makeResponse(1));

      await hasData(INDEX, client, logger);

      const params = search.mock.calls[0][0];
      expect(params.body.query.bool.filter).toEqual([
        { range: { [TIMESTAMP_FIELD]: { gte: 'now-24h/h' } } },
        { bool: { must_not: [{ terms: { _tier: ['data_cold', 'data_frozen'] } }] } },
      ]);
      // Transport-level ceiling must be top-level, not inside `body` —
      // callWithRequest strips it from there.
      expect(params.requestTimeout).toEqual(expect.any(String));
      expect(params.body.track_total_hits).toBe(1);
      expect(params.index).toBe(INDEX);
    });
  });

  describe('phase 2 — exact fallback', () => {
    it('runs unbounded and reports data when phase 1 misses old or cold-tier data', async () => {
      const { client, search } = createClient(makeResponse(0), makeResponse(1));

      await expect(hasData(INDEX, client, logger)).resolves.toBe(true);
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('does not carry the range or tier restriction into phase 2', async () => {
      // Phase 2 exists precisely to find the dormant/cold data phase 1 excluded,
      // so re-applying either filter would defeat it.
      const { client, search } = createClient(makeResponse(0), makeResponse(0));

      await hasData(INDEX, client, logger);

      const phase2 = JSON.stringify(search.mock.calls[1][0]);
      expect(phase2).not.toContain(TIMESTAMP_FIELD);
      expect(phase2).not.toContain('_tier');
    });

    it('returns false when both phases are empty and complete', async () => {
      const { client } = createClient(makeResponse(0), makeResponse(0));

      await expect(hasData(INDEX, client, logger)).resolves.toBe(false);
    });
  });

  describe('CCS inconclusive-response reporting', () => {
    it.each([
      ['timed_out', { timed_out: true }],
      ['shard failures', { shardsFailed: 1 }],
      ['skipped CCS clusters', { clustersSkipped: 1 }],
      ['failed CCS clusters', { clustersFailed: 1 }],
    ])('still reports no data but warns on %s', async (_label, opts) => {
      const { client } = createClient(makeResponse(0), makeResponse(0, opts));

      // Returning `false` is deliberate — erroring here would be a behaviour
      // change. The warning is what makes the false-negative rate measurable.
      await expect(hasData(INDEX, client, logger)).resolves.toBe(false);
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('logs the index pattern, signals and counts so the rate can be aggregated', async () => {
      const { client } = createClient(
        makeResponse(0),
        makeResponse(0, { clustersSkipped: 2, shardsFailed: 3 })
      );

      await hasData(INDEX, client, logger);

      const [message] = logger.warn.mock.calls[0];
      expect(message).toContain(INDEX);
      expect(message).toContain('shards_failed=3');
      expect(message).toContain('clusters_skipped=2');
    });

    it('does not warn when an incomplete phase 2 still found a hit', async () => {
      // A positive hit conclusively proves data exists, so a partial CCS outage
      // is not worth reporting.
      const { client } = createClient(
        makeResponse(0),
        makeResponse(1, { clustersSkipped: 1, shardsFailed: 1 })
      );

      await expect(hasData(INDEX, client, logger)).resolves.toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not throw for a complete zero-hit response', async () => {
      const { client } = createClient(makeResponse(0), makeResponse(0));

      await expect(hasData(INDEX, client, logger)).resolves.toBe(false);
    });
  });
});
