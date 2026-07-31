/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { RunMetrics } from './utils/run_metrics_tracker';

type EntityMaintainerRunSummary = Parameters<
  Parameters<NonNullable<RegisterEntityMaintainerConfig['run']>>[0]['telemetry']['report']
>[0];

/**
 * Builds the entity-maintainers framework run-summary payload for one
 * risk-score entity-type sub-run.
 *
 * Funnel is base-scoring only for now; resolution/reset land in `stages[]` later.
 *
 * TODO - after #280948 (create-if-missing):
 * - scanned           = scores calculated from alerts          (unchanged)
 * - applied           = scores written (updates only)
 *                     → scores written (update or create)
 * - droppedNotInStore = absent → hard drop
 *                     → absent at lookup (before create)
 * - skipped           = (unset)
 *                     → absent + policy rejected (score not written)
 */
export const buildRiskScoreEntityMaintainerRunSummary = ({
  entityType,
  metrics,
}: {
  entityType: string;
  metrics: RunMetrics;
}): EntityMaintainerRunSummary => {
  const qualifiedBase = metrics.scoresCalculatedBase - metrics.scoresDroppedNotInStore;

  return {
    scope: { kind: 'entity_type', value: entityType },
    iterations: metrics.pagesProcessed,
    funnel: {
      scanned: metrics.scoresCalculatedBase,
      qualified: qualifiedBase,
      applied: metrics.scoresWrittenBase,
      droppedNotInStore: metrics.scoresDroppedNotInStore,
      failed: metrics.scoresFailedBase,
    },
  };
};
