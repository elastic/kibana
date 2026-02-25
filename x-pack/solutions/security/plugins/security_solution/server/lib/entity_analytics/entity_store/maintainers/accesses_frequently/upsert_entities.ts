/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import type { EntityType } from '../../../../../../common/api/entity_analytics/entity_store';
import { getEntityUpdatesDataStreamName } from '../../elasticsearch_assets/updates_entity_data_stream';
import type { ProcessedEntityRecord } from './types';

function buildEntityUpdateDoc(entityType: EntityType, record: ProcessedEntityRecord) {
  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    [entityType]: {
      name: record.entityId,
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
    },
  };
}

export async function upsertEntityRelationships(
  esClient: ElasticsearchClient,
  logger: Logger,
  namespace: string,
  records: ProcessedEntityRecord[]
): Promise<number> {
  if (records.length === 0) return 0;

  const entityType: EntityType = 'user';
  const index = getEntityUpdatesDataStreamName(entityType, namespace);

  const operations = records.flatMap((r) => [{ create: {} }, buildEntityUpdateDoc(entityType, r)]);

  const result = await esClient.bulk({ index, operations });
  const failedCount = result.errors ? result.items.filter((i) => i.create?.error).length : 0;
  const upserted = records.length - failedCount;

  if (failedCount > 0) {
    const errors = result.items
      .filter((i) => i.create?.error)
      .map((i) => JSON.stringify(i.create?.error));
    logger.error(`Failed to upsert ${failedCount} entity records: ${errors.join(', ')}`);
  }

  logger.info(`Upserted ${upserted} entity relationship records to ${index}`);
  return upserted;
}
