/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { Entity, EntityType } from '@kbn/entity-store/common';

interface CheckEntityExistsParams {
  crudClient: EntityStoreCRUDClient;
  esClient: ElasticsearchClient;
  entityId: string;
  entityType: EntityType;
}
export class EntityStoreAccessError extends Error {
  constructor(message = 'Insufficient privileges to access feature') {
    super(message);
    this.name = 'EntityStoreAccessError';
  }
}

/**
 * Returns the entity record for the given EUID (`entity.id`) and type, or
 * `null` if no such entity exists in the store. Used to 404 requests for
 * entities that either never existed or have since been removed, and to
 * provide the caller with the entity record for downstream identity filtering.
 *
 * For hidden indices, ES silently returns empty results when the user lacks
 * read access (rather than 403), so we check index privileges explicitly
 * before querying to ensure "no access" surfaces as EntityStoreAccessError.
 */
export const checkEntityExists = async ({
  crudClient,
  esClient,
  entityId,
  entityType,
}: CheckEntityExistsParams): Promise<Entity | null> => {
  const latestIndex = await crudClient.latestIndexName();
  const { has_all_requested: hasRead } = await esClient.security.hasPrivileges({
    index: [{ names: [latestIndex], privileges: ['read'] }],
  });
  if (!hasRead) {
    throw new EntityStoreAccessError();
  }

  try {
    const { entities } = await crudClient.listEntities({
      filter: [
        { term: { 'entity.id': entityId } },
        { term: { 'entity.EngineMetadata.Type': entityType } },
      ],
      size: 1,
    });

    return entities[0] ?? null;
  } catch (err) {
    if (err?.statusCode === 403) {
      throw new EntityStoreAccessError();
    }
    throw err;
  }
};
