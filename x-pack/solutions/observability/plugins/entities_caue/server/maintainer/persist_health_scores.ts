/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { Logger } from '@kbn/core/server';
import type { EntityHealthLevels } from '../../common/health_score';

interface HealthScore {
  entityId: string;
  level: EntityHealthLevels;
  score: number; // degradation (higher = worse)
  scoreNorm: number; // health (higher = better), 0–100
}

/**
 * Writes health score fields back onto entity documents via a bulk partial update.
 *
 * Mirrors security_solution/server/lib/entity_analytics/risk_score/persist_risk_scores_to_entity_store.ts.
 * Key design choices:
 * - `force: true` — required because service.health.* managed fields have allowAPIUpdate: false
 * - 404 / document_missing_exception are normal (entity not yet extracted) and are debug-logged only
 */
export const persistHealthScores = async ({
  crudClient,
  scores,
  logger,
}: {
  crudClient: EntityUpdateClient;
  scores: HealthScore[];
  logger: Logger;
}): Promise<{ applied: number; failed: number }> => {
  if (scores.length === 0) return { applied: 0, failed: 0 };

  const objects = scores.map(({ entityId, level, score, scoreNorm }) => ({
    type: 'service' as const,
    doc: {
      entity: { id: entityId },
      service: {
        health: {
          calculated_level: level,
          calculated_score: score,
          calculated_score_norm: scoreNorm,
        },
      },
    },
  }));

  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  let failed = 0;
  for (const err of errors) {
    if (err.status === 404 || err.type === 'document_missing_exception') {
      logger.debug(`[service-health-score] Entity not yet extracted (expected): ${err._id}`);
    } else {
      logger.warn(
        `[service-health-score] Failed to update entity ${err._id}: ${err.reason} (status ${err.status})`
      );
      failed++;
    }
  }

  return { applied: scores.length - errors.length, failed };
};
