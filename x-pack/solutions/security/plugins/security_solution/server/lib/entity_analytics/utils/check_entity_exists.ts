/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { Entity, EntityType } from '@kbn/entity-store/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  buildEntityIdFilter,
  RESOLVED_MODE_MAX_RECORDS,
  type EntityViewMode,
} from '../../../../common/entity_analytics/entity_store/resolution_group';

interface CheckEntityExistsParams {
  crudClient: EntityStoreCRUDClient;
  esClient: ElasticsearchClient;
  entityId: string;
  entityType: EntityType;
}

type ListEntityRecordsParams = Pick<CheckEntityExistsParams, 'crudClient' | 'esClient'> & {
  filter: QueryDslQueryContainer[];
  size: number;
};

interface GetEntityRecordsParams extends CheckEntityExistsParams {
  mode?: EntityViewMode;
}
export class EntityStoreAccessError extends Error {
  constructor(message = 'Insufficient privileges to access feature') {
    super(message);
    this.name = 'EntityStoreAccessError';
  }
}

/**
 * Lists entity store records using the provided `filter` and `size`,
 *
 * For hidden indices, ES silently returns empty results when the user lacks
 * read access (rather than 403), so we check index privileges explicitly
 * before querying to ensure "no access" surfaces as EntityStoreAccessError.
 */
const listEntityRecords = async ({
  crudClient,
  esClient,
  filter,
  size,
}: ListEntityRecordsParams): Promise<Entity[]> => {
  const latestIndex = await crudClient.latestIndexName();
  const { has_all_requested: hasRead } = await esClient.security.hasPrivileges({
    index: [{ names: [latestIndex], privileges: ['read'] }],
  });
  if (!hasRead) {
    throw new EntityStoreAccessError();
  }

  try {
    const { entities } = await crudClient.listEntities({ filter, size });
    return entities;
  } catch (err) {
    if (err?.statusCode === 403) {
      throw new EntityStoreAccessError();
    }
    throw err;
  }
};

/**
 * Returns the entity record for the given EUID (`entity.id`) and type, or
 * `null` if no such entity exists in the store. Used to 404 requests for
 * entities that either never existed or have since been removed, and to
 * provide the caller with the entity record for downstream identity filtering.
 */
export const checkEntityExists = async ({
  crudClient,
  esClient,
  entityId,
  entityType,
}: CheckEntityExistsParams): Promise<Entity | null> => {
  const entities = await listEntityRecords({
    crudClient,
    esClient,
    filter: [
      { term: { 'entity.id': entityId } },
      { term: { 'entity.EngineMetadata.Type': entityType } },
    ],
    size: 1,
  });
  return entities[0] ?? null;
};

/**
 * Entity records the given EUID covers in `mode`: the target record first, followed (in `resolved`
 * mode) by every record resolved to it, i.e. its resolution group. Empty when the target itself is
 * missing — aliases never stand in for the target.
 */
export const getEntityRecords = async ({
  crudClient,
  esClient,
  entityId,
  entityType,
  mode = 'single',
}: GetEntityRecordsParams): Promise<Entity[]> => {
  const target = await checkEntityExists({ crudClient, esClient, entityId, entityType });
  if (!target) {
    return [];
  }
  if (mode !== 'resolved') {
    return [target];
  }

  // Get any entities that resolve to this entity
  const resolvedEntities = await listEntityRecords({
    crudClient,
    esClient,
    filter: [
      buildEntityIdFilter(entityId, 'resolved'),
      { term: { 'entity.EngineMetadata.Type': entityType } },
    ],
    size: RESOLVED_MODE_MAX_RECORDS,
  });
  return [target, ...resolvedEntities.filter((entity) => entity.entity?.id !== entityId)];
};
