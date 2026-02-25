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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accesses_frequently:
          record.Accesses_frequently.length > 0 ? record.Accesses_frequently : undefined,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accesses_infrequently:
          record.Accesses_infrequently.length > 0 ? record.Accesses_infrequently : undefined,
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
  const errors = await crudClient.upsertEntitiesBulk(entities, true);

  const upserted = records.length - errors.length;
  if (errors.length > 0) {
    logger.error(`Failed to upsert ${errors.length} entity records: ${JSON.stringify(errors)}`);
  }

  logger.info(`Upserted ${upserted} entity relationship records`);
  return upserted;
}
