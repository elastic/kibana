/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { CRUDClient } from '@kbn/entity-store/server';
import type { EntityType } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';

import type { ProcessedEntityRecord } from './types';

function buildEntityDoc(record: ProcessedEntityRecord): Entity {
  return {
    entity: {
      id: record.entityId,
      relationships: {
        accesses_frequently:
          record.accesses_frequently.length > 0 ? record.accesses_frequently : undefined,
        accesses_infrequently:
          record.accesses_infrequently.length > 0 ? record.accesses_infrequently : undefined,
      },
    },
  } as Entity;
}

export async function upsertEntityRelationships(
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const entityType: EntityType = 'user';

  const crudClient = new CRUDClient({ esClient, logger, namespace });
  const entities = records.map((r) => ({ type: entityType, doc: buildEntityDoc(r) }));

  logger.info(`Upserting ${entities.length} entity relationship records via CRUD bulk API`);
  const errors = await crudClient.upsertEntitiesBulk({ objects: entities, force: true });

  const upserted = records.length - errors.length;
  if (errors.length > 0) {
    logger.error(`Failed to upsert ${errors.length} entity records: ${JSON.stringify(errors)}`);
  }

  logger.info(`Upserted ${upserted} entity relationship records`);
  return upserted;
}
