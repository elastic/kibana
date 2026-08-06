/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { RunMetrics } from './utils/run_metrics_tracker';
import type { BuildLookupIndexResult } from './steps/build_lookup_index';

type EntityMaintainerRunSummary = Parameters<
  Parameters<NonNullable<RegisterEntityMaintainerConfig['run']>>[0]['telemetry']['report']
>[0];

export interface RiskScoreFrameworkStageSummary {
  name: 'base' | 'resolution' | 'reset_to_zero';
  status: 'success' | 'error' | 'skipped';
  durationMs: number;
  applied?: number;
  skipReason?: string;
  errorKind?: string;
}

const EMPTY_FUNNEL = {
  scanned: 0,
  qualified: 0,
  applied: 0,
  failed: 0,
} as const;

/**
 * Global license/feature skip — once per scheduled run that cannot start.
 */
export const buildRiskScoreSkipEntityMaintainerRunSummary = ({
  skipReason,
}: {
  skipReason: string;
}): EntityMaintainerRunSummary => ({
  funnel: { ...EMPTY_FUNNEL },
  stages: [
    {
      name: 'run',
      status: 'skipped',
      durationMs: 0,
      skipReason,
    },
  ],
});

/**
 * Builds the entity-maintainers framework run-summary payload for phase 0
 * lookup-index build (once per maintainer run, not per entity type).
 */
export const buildRiskScorePhase0EntityMaintainerRunSummary = ({
  status,
  durationMs,
  summary,
  errorKind,
}: {
  status: 'success' | 'error';
  durationMs: number;
  summary?: BuildLookupIndexResult;
  errorKind?: string;
}): EntityMaintainerRunSummary => {
  const entitiesIterated = summary?.entitiesIterated ?? 0;
  const lookupRowsWritten = summary?.lookupRowsWritten ?? 0;
  const lookupRowsFailed = summary?.lookupRowsFailed ?? 0;
  const pagesProcessed = summary?.pagesProcessed ?? 0;

  return {
    iterations: pagesProcessed,
    funnel: {
      scanned: entitiesIterated,
      qualified: entitiesIterated,
      applied: lookupRowsWritten,
      failed: lookupRowsFailed,
    },
    stages: [
      {
        name: 'phase0_lookup_build',
        status,
        durationMs,
        applied: lookupRowsWritten,
        ...(errorKind !== undefined ? { errorKind } : {}),
      },
    ],
  };
};

/**
 * Builds the entity-maintainers framework run-summary payload for one
 * risk-score entity-type sub-run.
 *
 * Funnel is the base-scoring entity-store path only
 * - stages[] = base / resolution / reset_to_zero applied + status/duration
 *
 * With the create-if-missing path (#280948):
 * - scanned   = scores calculated from alerts
 * - qualified = scanned minus `skipped`, i.e. entities that were either already in the store,
 *               successfully created/raced, or policy-eligible but write-failed (write failures
 *               stay qualified — they were never rejected up front, see `failed` below)
 * - applied   = successful existing-entity updates plus successful creates, counted exactly once
 * - skipped   = not_in_store scores the create-if-missing path never attempted to write (no
 *               representative alert document, or the creation policy rejected the candidate)
 * - failed    = entity-store update failures plus create-if-missing write failures
 *               (`euid_mismatch`, `reserved_field`, `bulk_create_failed`)
 *
 * `droppedNotInStore` is deliberately omitted here: the framework defines that field as 404
 * bulk-write errors, not pre-write lookup misses. The raw missing-before-create count
 * (`scoresMissingFromStoreBase`) is reported instead on the risk-score-specific
 * `phase1_base_scoring` stage-summary event.
 */
export const buildRiskScoreEntityMaintainerRunSummary = ({
  entityType,
  metrics,
  stages,
}: {
  entityType: string;
  metrics: RunMetrics;
  stages: RiskScoreFrameworkStageSummary[];
}): EntityMaintainerRunSummary => {
  const skipped = metrics.entitiesCreateSkipped;
  const qualifiedBase = metrics.scoresCalculatedBase - skipped;
  const appliedBase = metrics.scoresWrittenEntityStoreBase + metrics.entitiesCreated;
  const failedBase = metrics.scoresFailedBase + metrics.entitiesCreateFailed;

  return {
    scope: { kind: 'entity_type', value: entityType },
    iterations: metrics.pagesProcessed,
    funnel: {
      scanned: metrics.scoresCalculatedBase,
      qualified: qualifiedBase,
      applied: appliedBase,
      skipped,
      failed: failedBase,
    },
    stages,
  };
};
