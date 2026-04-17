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
  entityType: EntityType;
  targets: Set<string>;
}

function filterValid(records: ProcessedEntityRecord[]): ValidRecord[] {
  return records.filter(
    (r): r is ValidRecord => r.entityId !== null && r.communicates_with.ids.length > 0
  );
}

function seed(r: ValidRecord): MergedEntity {
  return {
    entityType: r.entityType,
    targets: new Set(r.communicates_with.ids),
  };
}

function merge(acc: MergedEntity, r: ValidRecord): MergedEntity {
  for (const id of r.communicates_with.ids) acc.targets.add(id);
  return acc;
}

function mergeRecordsByEntityId(records: ProcessedEntityRecord[]): Map<string, MergedEntity> {
  return groupByEntityId(filterValid(records), seed, merge);
}

export async function updateEntityRelationships(
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const merged = mergeRecordsByEntityId(records);

  const objects: BulkObject[] = Array.from(merged, ([entityId, { entityType, targets }]) => ({
    type: entityType,
    doc: {
      entity: {
        id: entityId,
        relationships: {
          communicates_with: { ids: Array.from(targets) },
        },
      },
    } satisfies Entity,
  }));

  if (objects.length === 0) return 0;

  logger.info(`Updating ${objects.length} entity relationship records via bulk API`);
  const errors = await crudClient.bulkUpdateEntity({ objects, force: true });

  const updated = objects.length - errors.length;
  if (errors.length > 0) {
    logger.error(`Failed to update ${errors.length} entity records: ${JSON.stringify(errors)}`);
  }

  logger.info(`Updated ${updated} entity relationship records`);
  return updated;
}
