/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityUpdateClient, BulkObject } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';

const scoreToEntityDoc = (
  entityType: EntityType,
  score: EntityRiskScoreRecord
): { type: EntityType; doc: Entity } => ({
  type: entityType,
  doc: {
    entity: {
      id: score.id_value,
      ...(score.score_type === 'resolution'
        ? {
            relationships: {
              resolution: {
                risk: {
                  calculated_level: score.calculated_level,
                  calculated_score: score.calculated_score,
                  calculated_score_norm: score.calculated_score_norm,
                },
              },
            },
          }
        : {
            risk: {
              calculated_level: score.calculated_level,
              calculated_score: score.calculated_score,
              calculated_score_norm: score.calculated_score_norm,
            },
          }),
    },
  } as Entity,
});

export const persistRiskScoresToEntityStore = async ({
  crudClient,
  logger,
  scores,
  refresh,
  parallelChunks = 1,
}: {
  crudClient: Pick<EntityUpdateClient, 'bulkUpdateEntity'>;
  logger: Pick<Logger, 'debug' | 'warn'>;
  scores: Partial<Record<EntityType, EntityRiskScoreRecord[]>>;
  /** The bulk update waits for a refresh unless this is `false`. */
  refresh?: 'wait_for' | false;
  /** Splits the write into this many bulk requests, sent at the same time. */
  parallelChunks?: number;
}) => {
  const allObjects: BulkObject[] = [];
  for (const [entityType, entityScores] of Object.entries(scores)) {
    if (entityScores && entityScores.length > 0) {
      for (const score of entityScores) {
        allObjects.push(scoreToEntityDoc(entityType as EntityType, score));
      }
    }
  }

  if (allObjects.length === 0) {
    return { docsWritten: 0, unexpectedErrors: [], tookMs: 0 };
  }

  const chunkSize = Math.ceil(allObjects.length / Math.max(1, parallelChunks));
  const chunks = Array.from({ length: Math.ceil(allObjects.length / chunkSize) }, (_, index) =>
    allObjects.slice(index * chunkSize, (index + 1) * chunkSize)
  );
  // Elasticsearch's own time, summed over the chunks.
  let tookMs = 0;
  const errors = (
    await Promise.all(
      chunks.map((objects) =>
        crudClient.bulkUpdateEntity({
          objects,
          force: true,
          refresh,
          onTook: (took) => {
            tookMs += took;
          },
        })
      )
    )
  ).flat();

  const missingEntityErrors = errors.filter(isMissingEntityUpdateError);
  const unexpectedErrors = errors.filter((error) => !isMissingEntityUpdateError(error));

  if (missingEntityErrors.length > 0) {
    logger.debug(
      `persistRiskScoresToEntityStore: skipped ${missingEntityErrors.length} score(s) for missing entities`
    );
  }

  if (unexpectedErrors.length > 0) {
    logger.warn(
      `persistRiskScoresToEntityStore: ${unexpectedErrors.length} unexpected bulk update error(s)`
    );
  }

  return {
    docsWritten: allObjects.length - errors.length,
    unexpectedErrors: unexpectedErrors.map((e) => `[${e._id}] ${e.reason}`),
    tookMs,
  };
};

const isMissingEntityUpdateError = ({ status, type }: { status: number; type?: string }): boolean =>
  status === 404 || type === 'document_missing_exception';
