/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { EntityUpdateClient, BulkObject } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEntityRecord } from './types';

interface MergedEntity {
  entityType: string;
  targets: Set<string>;
}

function mergeRecordsByEntityId(records: ProcessedEntityRecord[]): Map<string, MergedEntity> {
  const merged = new Map<string, MergedEntity>();
  for (const r of records) {
    if (r.entityId && r.communicates_with.length > 0) {
      const existing = merged.get(r.entityId);
      if (existing) {
        for (const t of r.communicates_with) existing.targets.add(t);
      } else {
        merged.set(r.entityId, {
          entityType: r.entityType,
          targets: new Set(r.communicates_with),
        });
      }
    }
  }
  return merged;
}

export async function updateEntityRelationships(
  crudClient: EntityUpdateClient,
  logger: Logger,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const merged = mergeRecordsByEntityId(records);

  const objects: BulkObject[] = Array.from(merged, ([entityId, { entityType, targets }]) => ({
    type: entityType as BulkObject['type'],
    doc: {
      entity: {
        id: entityId,
        relationships: {
          communicates_with: Array.from(targets),
        },
      },
    } as Entity,
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
