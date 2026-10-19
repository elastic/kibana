/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunMetrics } from './utils/run_metrics_tracker';
import {
  buildAlertSourceBreakdown,
  buildRiskScoreEntityMaintainerRunSummary,
  buildRiskScorePhase0EntityMaintainerRunSummary,
  buildRiskScoreSkipEntityMaintainerRunSummary,
} from './entity_maintainer_run_summary';

const emptyMetrics = (overrides: Partial<RunMetrics> = {}): RunMetrics => ({
  scoresWrittenRiskIndexBase: 0,
  scoresWrittenRiskIndexResolution: 0,
  scoresWrittenRiskIndexResetToZero: 0,
  scoresWrittenEntityStoreBase: 0,
  scoresWrittenEntityStoreResolution: 0,
  scoresWrittenEntityStoreResetToZero: 0,
  scoresCalculatedBase: 0,
  scoresDroppedNotInStore: 0,
  scoresMissingFromStoreBase: 0,
  scoresFailedBase: 0,
  scoresFailedResolution: 0,
  scoresFailedResetToZero: 0,
  pagesProcessed: 0,
  lookupPrunedDocs: 0,
  entitiesCreated: 0,
  entitiesCreateSkipped: 0,
  entitiesCreateFailed: 0,
  ...overrides,
});

describe('buildRiskScoreSkipEntityMaintainerRunSummary', () => {
  it('returns an empty funnel and a skipped run stage with the given reason', () => {
    expect(
      buildRiskScoreSkipEntityMaintainerRunSummary({ skipReason: 'feature_disabled' })
    ).toEqual({
      funnel: { scanned: 0, qualified: 0, applied: 0, failed: 0 },
      stages: [
        {
          name: 'run',
          status: 'skipped',
          durationMs: 0,
          skipReason: 'feature_disabled',
        },
      ],
    });
  });
});

describe('buildRiskScorePhase0EntityMaintainerRunSummary', () => {
  it('maps lookup-build metrics into funnel and stage payloads on success', () => {
    expect(
      buildRiskScorePhase0EntityMaintainerRunSummary({
        status: 'success',
        durationMs: 42,
        summary: {
          entitiesIterated: 10,
          lookupRowsWritten: 8,
          lookupRowsFailed: 2,
          pagesProcessed: 3,
          bulkBatches: 1,
        },
      })
    ).toEqual({
      iterations: 3,
      funnel: {
        scanned: 10,
        qualified: 10,
        applied: 8,
        failed: 2,
      },
      stages: [
        {
          name: 'phase0_lookup_build',
          status: 'success',
          durationMs: 42,
          applied: 8,
        },
      ],
    });
  });

  it('defaults missing summary fields to zero and omits errorKind when unset', () => {
    expect(
      buildRiskScorePhase0EntityMaintainerRunSummary({
        status: 'error',
        durationMs: 7,
      })
    ).toEqual({
      iterations: 0,
      funnel: {
        scanned: 0,
        qualified: 0,
        applied: 0,
        failed: 0,
      },
      stages: [
        {
          name: 'phase0_lookup_build',
          status: 'error',
          durationMs: 7,
          applied: 0,
        },
      ],
    });
  });

  it('includes errorKind on the stage when provided', () => {
    expect(
      buildRiskScorePhase0EntityMaintainerRunSummary({
        status: 'error',
        durationMs: 5,
        errorKind: 'unexpected',
      })
    ).toEqual({
      iterations: 0,
      funnel: {
        scanned: 0,
        qualified: 0,
        applied: 0,
        failed: 0,
      },
      stages: [
        {
          name: 'phase0_lookup_build',
          status: 'error',
          durationMs: 5,
          applied: 0,
          errorKind: 'unexpected',
        },
      ],
    });
  });
});

describe('buildRiskScoreEntityMaintainerRunSummary', () => {
  it('builds funnel from base-scoring metrics with qualified = scanned - skipped', () => {
    const stages = [
      { name: 'base' as const, status: 'success' as const, durationMs: 10, applied: 7 },
      { name: 'resolution' as const, status: 'success' as const, durationMs: 4, applied: 2 },
      { name: 'reset_to_zero' as const, status: 'skipped' as const, durationMs: 0 },
    ];

    expect(
      buildRiskScoreEntityMaintainerRunSummary({
        entityType: 'host',
        metrics: emptyMetrics({
          scoresCalculatedBase: 12,
          scoresDroppedNotInStore: 3,
          scoresMissingFromStoreBase: 3,
          scoresWrittenRiskIndexBase: 7,
          scoresWrittenEntityStoreBase: 7,
          scoresFailedBase: 2,
          pagesProcessed: 5,
        }),
        stages,
      })
    ).toEqual({
      scope: { kind: 'entity_type', value: 'host' },
      iterations: 5,
      funnel: {
        scanned: 12,
        qualified: 9,
        applied: 7,
        skipped: 3,
        failed: 2,
      },
      stages,
    });
  });

  it('maps funnel.applied from entity-store writes, not risk-index writes', () => {
    expect(
      buildRiskScoreEntityMaintainerRunSummary({
        entityType: 'host',
        metrics: emptyMetrics({
          scoresCalculatedBase: 5,
          scoresWrittenRiskIndexBase: 5,
          scoresWrittenEntityStoreBase: 0,
          scoresFailedBase: 0,
          pagesProcessed: 1,
        }),
        stages: [],
      }).funnel
    ).toEqual({
      scanned: 5,
      qualified: 5,
      applied: 0,
      skipped: 0,
      failed: 0,
    });
  });

  it('folds create-if-missing recoveries into applied/qualified, keeping skipped narrower than the raw miss count', () => {
    expect(
      buildRiskScoreEntityMaintainerRunSummary({
        entityType: 'host',
        metrics: emptyMetrics({
          scoresCalculatedBase: 10,
          scoresMissingFromStoreBase: 5,
          entitiesCreated: 3,
          entitiesCreateSkipped: 2,
          scoresDroppedNotInStore: 2,
          scoresWrittenRiskIndexBase: 8,
          scoresWrittenEntityStoreBase: 5,
          scoresFailedBase: 0,
          pagesProcessed: 2,
        }),
        stages: [],
      }).funnel
    ).toEqual({
      scanned: 10,
      qualified: 8,
      applied: 8,
      skipped: 2,
      failed: 0,
    });
  });

  it('adds create-if-missing write failures into funnel.failed while keeping them qualified', () => {
    expect(
      buildRiskScoreEntityMaintainerRunSummary({
        entityType: 'host',
        metrics: emptyMetrics({
          scoresCalculatedBase: 6,
          // The failed create remains dropped but qualified, not skipped.
          scoresMissingFromStoreBase: 2,
          scoresDroppedNotInStore: 1,
          entitiesCreated: 1,
          entitiesCreateFailed: 1,
          scoresWrittenRiskIndexBase: 5,
          scoresWrittenEntityStoreBase: 4,
          scoresFailedBase: 0,
          pagesProcessed: 1,
        }),
        stages: [],
      }).funnel
    ).toEqual({
      scanned: 6,
      qualified: 6,
      applied: 5,
      skipped: 0,
      failed: 1,
    });
  });

  it('keeps the funnel balanced with create-if-missing disabled (skipped = raw not-in-store misses)', () => {
    expect(
      buildRiskScoreEntityMaintainerRunSummary({
        entityType: 'host',
        metrics: emptyMetrics({
          scoresCalculatedBase: 10,
          scoresMissingFromStoreBase: 4,
          scoresDroppedNotInStore: 4,
          scoresWrittenRiskIndexBase: 6,
          scoresWrittenEntityStoreBase: 6,
          scoresFailedBase: 0,
          pagesProcessed: 3,
        }),
        stages: [],
      }).funnel
    ).toEqual({
      scanned: 10,
      qualified: 6,
      applied: 6,
      skipped: 4,
      failed: 0,
    });
  });
});

describe('buildAlertSourceBreakdown', () => {
  it('emits scored and unmatched entries per source and leaves out zero counts', () => {
    expect(
      buildAlertSourceBreakdown({
        okta: { scored: 10, unmatched: 0 },
        azure: { scored: 3, unmatched: 4 },
      })
    ).toEqual([
      { name: 'alerts_scored:okta', count: 10 },
      { name: 'alerts_scored:azure', count: 3 },
      { name: 'alerts_unmatched:azure', count: 4 },
    ]);
  });

  it('keeps the top 30 sources by alert count and adds up the rest as other', () => {
    const alertSources = Object.fromEntries(
      Array.from({ length: 33 }, (_, i) => [`source_${i}`, { scored: 100 - i, unmatched: 1 }])
    );

    const breakdown = buildAlertSourceBreakdown(alertSources);
    const scored = breakdown.filter(({ name }) => name.startsWith('alerts_scored:'));

    expect(scored).toHaveLength(31);
    expect(scored[0]).toEqual({ name: 'alerts_scored:source_0', count: 100 });
    expect(scored[29]).toEqual({ name: 'alerts_scored:source_29', count: 71 });
    // source_30..source_32 scored 70 + 69 + 68, unmatched 3
    expect(breakdown).toContainEqual({ name: 'alerts_scored:other', count: 207 });
    expect(breakdown).toContainEqual({ name: 'alerts_unmatched:other', count: 3 });
  });

  it('shortens very long source names', () => {
    const [entry] = buildAlertSourceBreakdown({
      [`x${'y'.repeat(300)}`]: { scored: 1, unmatched: 0 },
    });

    expect(entry.name).toBe(`alerts_scored:x${'y'.repeat(99)}`);
  });

  it('returns nothing when there are no alerts', () => {
    expect(buildAlertSourceBreakdown({})).toEqual([]);
  });
});

describe('buildRiskScoreEntityMaintainerRunSummary alert sources', () => {
  const stages = [{ name: 'base' as const, status: 'success' as const, durationMs: 1 }];

  it('adds the breakdown when there are alert sources', () => {
    const summary = buildRiskScoreEntityMaintainerRunSummary({
      entityType: 'user',
      metrics: emptyMetrics(),
      stages,
      alertSources: { okta: { scored: 2, unmatched: 1 } },
    });

    expect(summary.breakdown).toEqual([
      { name: 'alerts_scored:okta', count: 2 },
      { name: 'alerts_unmatched:okta', count: 1 },
    ]);
  });

  it('leaves the breakdown out when there are none', () => {
    const withEmpty = buildRiskScoreEntityMaintainerRunSummary({
      entityType: 'user',
      metrics: emptyMetrics(),
      stages,
      alertSources: {},
    });
    const without = buildRiskScoreEntityMaintainerRunSummary({
      entityType: 'user',
      metrics: emptyMetrics(),
      stages,
    });

    expect(withEmpty).not.toHaveProperty('breakdown');
    expect(without).not.toHaveProperty('breakdown');
  });
});
