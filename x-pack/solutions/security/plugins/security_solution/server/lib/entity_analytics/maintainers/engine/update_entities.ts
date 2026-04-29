/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, BulkObject } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEngineRecord } from './types';

type ValidRecord = ProcessedEngineRecord & { entityId: string };

interface MergedRelationships {
  [relType: string]: Set<string>;
}

function hasAnyTargets(record: ProcessedEngineRecord): boolean {
  return Object.values(record.relationships).some((rel) => rel.length > 0);
}

function filterValid(records: ProcessedEngineRecord[]): ValidRecord[] {
  return records.filter((r): r is ValidRecord => r.entityId !== null && hasAnyTargets(r));
}

function mergeRecords(records: ValidRecord[]): Map<string, MergedRelationships> {
  const merged = new Map<string, MergedRelationships>();
  for (const record of records) {
    let entity = merged.get(record.entityId);
    if (!entity) {
      entity = {};
      merged.set(record.entityId, entity);
    }
    for (const [relType, rel] of Object.entries(record.relationships)) {
      if (!entity[relType]) {
        entity[relType] = new Set();
      }
      for (const id of rel) {
        entity[relType].add(id);
      }
    }
  }
  return merged;
}

export const writeEntityIds = async (
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEngineRecord[]
): Promise<number> => {
  if (records.length === 0) return 0;

  const valid = filterValid(records);
  if (valid.length === 0) return 0;

  const merged = mergeRecords(valid);

  const objects: BulkObject[] = [];
  for (const [entityId, mergedRels] of merged) {
    const relationships: Record<string, { ids: string[] }> = {};
    for (const [relType, idSet] of Object.entries(mergedRels)) {
      if (idSet.size > 0) {
        relationships[relType] = { ids: Array.from(idSet) };
      }
    }
    if (Object.keys(relationships).length > 0) {
      // TODO(follow-up): entity type hardcoded to 'user' — use actorEntityType from config.
      objects.push({
        type: 'user',
        doc: {
          entity: {
            id: entityId,
            relationships,
          },
        } as unknown as Entity,
      });
    }
  }

  if (objects.length === 0) return 0;

  logger.info(`Writing relationship ids for ${objects.length} entity records`);
  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  const missingErrors = errors.filter((e) => e.status === 404);
  const realErrors = errors.filter((e) => e.status !== 404);
  const updated = objects.length - errors.length;

  if (missingErrors.length > 0) {
    logger.debug(`Skipped ${missingErrors.length} records: entities not yet in store`);
  }
  if (realErrors.length > 0) {
    logger.error(`Failed to write ${realErrors.length} records: ${JSON.stringify(realErrors)}`);
  }

  logger.info(`Wrote relationship ids for ${updated} entities`);
  return updated;
};
