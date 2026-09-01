/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { Entity, EntityType } from '@kbn/entity-store/common';

interface CheckEntityExistsParams {
  crudClient: EntityStoreCRUDClient;
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
 */
export const checkEntityExists = async ({
  crudClient,
  entityId,
  entityType,
}: CheckEntityExistsParams): Promise<Entity | null> => {
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
