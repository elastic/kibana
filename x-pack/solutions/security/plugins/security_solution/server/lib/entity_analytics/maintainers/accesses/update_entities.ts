/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, BulkObject } from '@kbn/entity-store/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import { groupByEntityId } from '../group_by_entity_id';
import type { ProcessedEntityRecord } from './types';

type ValidRecord = ProcessedEntityRecord & { entityId: string };

interface MergedEntity {
  frequently: Set<string>;
  infrequently: Set<string>;
}

function filterValid(records: ProcessedEntityRecord[]): ValidRecord[] {
  return records.filter(
    (r): r is ValidRecord =>
      r.entityId !== null &&
      (r.accesses_frequently.ids.length > 0 || r.accesses_infrequently.ids.length > 0)
  );
}

function seed(r: ValidRecord): MergedEntity {
  return {
    frequently: new Set(r.accesses_frequently.ids),
    infrequently: new Set(r.accesses_infrequently.ids),
  };
}

function merge(acc: MergedEntity, r: ValidRecord): MergedEntity {
  for (const id of r.accesses_frequently.ids) acc.frequently.add(id);
  for (const id of r.accesses_infrequently.ids) acc.infrequently.add(id);
  return acc;
}

function applyPrecedence(grouped: Map<string, MergedEntity>): Map<string, MergedEntity> {
  for (const entity of grouped.values()) {
    for (const id of entity.frequently) entity.infrequently.delete(id);
  }
  return grouped;
}

function mergeRecordsByEntityId(records: ProcessedEntityRecord[]): Map<string, MergedEntity> {
  const valid = filterValid(records);
  const grouped = groupByEntityId(valid, seed, merge);
  return applyPrecedence(grouped);
}

export async function updateEntityRelationships(
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const entityType: EntityType = 'user';
  const merged = mergeRecordsByEntityId(records);

  const objects: BulkObject[] = Array.from(merged, ([entityId, { frequently, infrequently }]) => {
    const frequentlyIds = Array.from(frequently);
    const infrequentlyIds = Array.from(infrequently);
    return {
      type: entityType,
      doc: {
        entity: {
          id: entityId,
          relationships: {
            accesses_frequently: frequentlyIds.length > 0 ? { ids: frequentlyIds } : undefined,
            accesses_infrequently:
              infrequentlyIds.length > 0 ? { ids: infrequentlyIds } : undefined,
          },
        },
      } satisfies Entity,
    };
  });

  if (objects.length === 0) return 0;

  logger.info(`Updating ${objects.length} entity relationship records via CRUD bulk API`);
  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  const missingErrors = errors.filter((e) => e.status === 404);
  const realErrors = errors.filter((e) => e.status !== 404);
  const updatedCount = objects.length - errors.length;

  if (missingErrors.length > 0) {
    logger.debug(`Skipped ${missingErrors.length} records for entities not yet in store`);
  }
  if (realErrors.length > 0) {
    logger.error(
      `Failed to update ${realErrors.length} entity records: ${JSON.stringify(realErrors)}`
    );
  }

  logger.info(`Updated ${updatedCount} entity relationship records`);
  return updatedCount;
}
