/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planSliRetention } from './plan_sli_retention';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-17T00:00:00.000Z');
const RETENTION_MS = 180 * DAY_MS; // cutoff: 2026-05-21T00:00:00Z

const dated = (date: string, version: string = '3.6') =>
  `.slo-observability.sli-v${version}.${date}`;

const plan = (
  indices: Array<[string, number | undefined]>,
  { transformDestIndices }: { transformDestIndices: Set<string> | undefined } = {
    transformDestIndices: new Set(),
  }
) =>
  planSliRetention({
    indices: indices.map(([index, docsCount]) => ({ index, docsCount })),
    transformDestIndices,
    now: NOW,
    retentionMs: RETENTION_MS,
    currentVersion: 3.6,
  });

describe('planSliRetention', () => {
  describe('aged out dated indices', () => {
    it('deletes an index once its period ended before the retention cutoff, treating day-01 indices as monthly', () => {
      const result = plan([
        [dated('2026-05-13'), 10], // period end 2026-05-20
        [dated('2026-05-14'), 10], // period end 2026-05-21, exactly the cutoff
        [dated('2026-05-15'), 10],
        [dated('2026-04-01'), 10], // period end 2026-05-01
        [dated('2026-05-01'), 10], // period end 2026-06-01
      ]);

      expect(result.agedOut).toEqual([dated('2026-05-13'), dated('2026-04-01')]);
    });

    it('deletes aged out indices of older versions', () => {
      const result = plan([
        [dated('2025-01-01', '3.5'), 10],
        [dated('2025-01-02', '3'), 10],
        [dated('2025-01-03', '3.10'), 10],
      ]);

      expect(result.agedOut).toEqual([
        dated('2025-01-01', '3.5'),
        dated('2025-01-02', '3'),
        dated('2025-01-03', '3.10'),
      ]);
    });
  });

  describe('empty dated indices', () => {
    it('deletes an empty index once its period ended more than 91 days ago, listing an aged out one once', () => {
      const result = plan([
        [dated('2026-08-10'), 0], // period end 2026-08-17
        [dated('2026-08-11'), 0], // period end 2026-08-18, exactly 91 days ago
        [dated('2026-07-01'), 0], // period end 2026-08-01
        [dated('2026-08-01'), 0], // period end 2026-09-01
        [dated('2026-01-02'), 0], // aged out
      ]);

      expect(result.emptyDated).toEqual([dated('2026-08-10'), dated('2026-07-01')]);
      expect(result.agedOut).toEqual([dated('2026-01-02')]);
    });

    it('keeps non empty indices and indices with an unknown doc count', () => {
      const result = plan([
        [dated('2026-07-02'), 1],
        [dated('2026-07-03'), undefined],
      ]);

      expect(result.emptyDated).toEqual([]);
    });
  });

  it('never deletes the index of the current period', () => {
    const result = plan([
      [dated('2026-11-17'), 0],
      [dated('2026-11-16'), 0],
      [dated('2026-11-01'), 0],
    ]);

    expect(result).toEqual({ agedOut: [], emptyDated: [], emptyOldBase: [] });
  });

  describe('base indices', () => {
    it('deletes empty base indices of older versions that no transform writes to', () => {
      const result = plan(
        [
          ['.slo-observability.sli-v3.6', 0],
          ['.slo-observability.sli-v3.5', 0],
          ['.slo-observability.sli-v3.4', 0],
          ['.slo-observability.sli-v3.3', 5],
          ['.slo-observability.sli-v3', 0],
        ],
        { transformDestIndices: new Set(['.slo-observability.sli-v3.4']) }
      );

      expect(result.emptyOldBase).toEqual([
        '.slo-observability.sli-v3.5',
        '.slo-observability.sli-v3',
      ]);
    });

    it('keeps old base indices when the transform destinations are unknown', () => {
      const result = plan([['.slo-observability.sli-v3.5', 0]], {
        transformDestIndices: undefined,
      });

      expect(result.emptyOldBase).toEqual([]);
    });
  });

  it('ignores indices that do not match the SLI index names', () => {
    const result = plan([
      ['.slo-observability.sli-v3.6-foo', 0],
      ['.slo-observability.sli-v3.6.2020-01-01-foo', 0],
      ['.slo-observability.sli-v3.6.2020-13-45', 0],
      ['.slo-observability.sli-v2.2020-01-01', 0],
      ['.slo-observability.summary-v3.6', 0],
      ['my-index-2020-01-01', 0],
    ]);

    expect(result).toEqual({ agedOut: [], emptyDated: [], emptyOldBase: [] });
  });
});
