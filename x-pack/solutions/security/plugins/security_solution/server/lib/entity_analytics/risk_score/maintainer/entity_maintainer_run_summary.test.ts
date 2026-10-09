/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunMetrics } from './utils/run_metrics_tracker';
import {
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
  scoresFailedBase: 0,
  scoresFailedResolution: 0,
  scoresFailedResetToZero: 0,
  pagesProcessed: 0,
  lookupPrunedDocs: 0,
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
  it('builds funnel from base-scoring metrics with qualified = scanned - droppedNotInStore', () => {
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
        droppedNotInStore: 3,
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
      droppedNotInStore: 0,
      failed: 0,
    });
  });
});
