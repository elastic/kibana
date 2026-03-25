/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { set } from '@kbn/safer-lodash-set';
import type { EntityStoreCRUDClient, BulkObject } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common';

import { EntityType } from '../../../../common/search_strategy';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { parseIdentitySourceFields } from './helpers';

const scoreToV2Document = (
  entityType: EntityType,
  score: EntityRiskScoreRecord
): Record<string, unknown> => {
  const risk = {
    calculated_score: score.calculated_score,
    calculated_score_norm: score.calculated_score_norm,
    calculated_level: score.calculated_level,
  };
  const document: Record<string, unknown> = {
    '@timestamp': score['@timestamp'],
    ...(entityType === EntityType.generic ? { entity: { risk } } : { [entityType]: { risk } }),
  };
  // Identity source fields may contain null or empty values
  // apply them to the document if they are not null or empty
  Object.entries(parseIdentitySourceFields(score.euid_fields_raw) || {}).forEach(
    ([path, value]) => {
      if (value != null && value !== '') {
        set(document, path, value);
      }
    }
  );

  return document;
};

const buildV2BulkObjectsFromScores = (
  scores: Partial<Record<EntityType, EntityRiskScoreRecord[]>>
): BulkObject[] => {
  const result: BulkObject[] = [];
  Object.values(EntityType).forEach((entityType) => {
    const entityScores = scores[entityType];
    if (entityScores) {
      entityScores.forEach((score) => {
        result.push({
          type: entityType,
          doc: scoreToV2Document(entityType, score) as Entity,
        });
      });
    }
  });
  return result;
};

export const persistRiskScoresToEntityStore = async ({
  entityStoreCRUDClient,
  logger,
  scores,
}: {
  entityStoreCRUDClient: EntityStoreCRUDClient;
  logger: Logger;
  scores: Partial<Record<EntityType, EntityRiskScoreRecord[]>>;
}): Promise<string[]> => {
  const errors: string[] = [];
  try {
    const bulkObjects = buildV2BulkObjectsFromScores(scores);
    const errorResponses = await entityStoreCRUDClient.upsertEntitiesBulk({
      objects: bulkObjects,
      force: true,
    });
    if (errorResponses.length > 0) {
      const reasons = errorResponses.map((r) => r.reason).filter(Boolean);
      logger.warn(
        `Entity store v2 write had ${errorResponses.length} error(s): ${reasons.join('; ')}`
      );
      errors.push(...reasons);
    }
  } catch (err) {
    logger.error(`Failed to write risk scores to entity store v2: ${(err as Error).message}`);
    errors.push((err as Error).message);
  }
  return errors;
};
