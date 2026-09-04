/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import { calculateHealthScore } from '../../common/health_score';
import { listServiceEntities } from './list_service_entities';
import { getAlertCounts } from './get_alert_counts';
import { persistHealthScores } from './persist_health_scores';

/** Batch size for alert queries to avoid unbounded terms aggregations. */
const ALERT_BATCH_SIZE = 500;

export const serviceHealthMaintainer: RegisterEntityMaintainerConfig = {
  id: 'service-health-score',
  description: 'Computes a health score for APM service entities from active alerts',
  interval: '1m',
  timeout: '10m',
  initialState: {},

  run: async ({ esClient, crudClient, logger, status, signal, telemetry }) => {
    const namespace = status.metadata.namespace;
    logger.info(`[service-health-score] Starting run in namespace: ${namespace}`);

    // -----------------------------------------------------------------------
    // Phase 1: list all service entities
    // -----------------------------------------------------------------------
    const entities = await listServiceEntities(crudClient, logger);
    logger.info(`[service-health-score] Found ${entities.length} service entities`);

    if (signal.aborted) return status.state;

    // -----------------------------------------------------------------------
    // Phase 2: fetch alert counts in batches and compute health scores
    // -----------------------------------------------------------------------
    let scanned = 0;
    let qualified = 0;
    let applied = 0;
    let failed = 0;

    for (let i = 0; i < entities.length; i += ALERT_BATCH_SIZE) {
      if (signal.aborted) break;

      const batch = entities.slice(i, i + ALERT_BATCH_SIZE);
      const serviceNames = batch.map((e) => e.serviceName);

      const alertCounts = await getAlertCounts({ esClient, namespace, serviceNames, logger });

      const scores = batch.map(({ entityId, serviceName }) => {
        scanned++;
        // null alertCounts means the query failed → Unknown
        const count = alertCounts !== null ? alertCounts.get(serviceName) ?? 0 : null;
        const result = calculateHealthScore(count);
        if (result === null) {
          // Unknown — do not write; leave field absent or stale
          return null;
        }
        qualified++;
        return {
          entityId,
          level: result.level,
          score: 100 - result.score, // degradation stored in calculated_score
          scoreNorm: result.score, // health stored in calculated_score_norm
        };
      });

      const validScores = scores.filter((s): s is NonNullable<typeof s> => s !== null);

      const { applied: batchApplied, failed: batchFailed } = await persistHealthScores({
        crudClient,
        scores: validScores,
        logger,
      });

      applied += batchApplied;
      failed += batchFailed;

      logger.debug(
        `[service-health-score] Batch ${Math.floor(i / ALERT_BATCH_SIZE) + 1}: ` +
          `${batchApplied} applied, ${batchFailed} failed`
      );
    }

    logger.info(
      `[service-health-score] Run complete: scanned=${scanned} qualified=${qualified} applied=${applied} failed=${failed}`
    );

    telemetry.report({
      funnel: { scanned, qualified, applied, failed },
    });

    // Stateless maintainer: return unchanged state
    return status.state;
  },
};
