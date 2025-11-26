/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import type { EntityStoreEsqlConfig } from './config';

// Saved Object Type and Mapping
export const ENTITY_STORE_EXECUTION_TIME_SO = 'entity-store-esql-execution-time';

export interface EntityStoreStateAttributes {
  entityType: EntityType;
  lastExecutionTimeISO: string | null;
  config: EntityStoreEsqlConfig;
}

export async function getEntityStoreState(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string
): Promise<EntityStoreStateAttributes> {
  const id = getEntityTypeSavedObjectId(entityType, namespace);
  const so = await soClient.get<EntityStoreStateAttributes>(ENTITY_STORE_EXECUTION_TIME_SO, id);
  return so.attributes;
}

export async function createEntityStoreState(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string,
  config: EntityStoreEsqlConfig
) {
  const id = getEntityTypeSavedObjectId(entityType, namespace);
  await soClient.create<EntityStoreStateAttributes>(
    ENTITY_STORE_EXECUTION_TIME_SO,
    { entityType, lastExecutionTimeISO: null, config },
    { id, overwrite: true }
  );
}

export async function deleteEntityStoreState(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string
) {
  const id = getEntityTypeSavedObjectId(entityType, namespace);
  await soClient.delete(ENTITY_STORE_EXECUTION_TIME_SO, id);
}

export async function updateEntityStoreLastExecutionTime(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string,
  lastExecutionTimeISO: string
): Promise<void> {
  const id = getEntityTypeSavedObjectId(entityType, namespace);
  await soClient.update<EntityStoreStateAttributes>(ENTITY_STORE_EXECUTION_TIME_SO, id, {
    entityType,
    lastExecutionTimeISO,
  });
}

export async function getEntityStoreLastExecutionTime(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string
): Promise<string | null> {
  try {
    const state = await getEntityStoreState(soClient, entityType, namespace);
    return state.lastExecutionTimeISO ?? null;
  } catch (_e) {
    return null;
  }
}

function getEntityTypeSavedObjectId(entityType: string, namespace: string): string {
  return `${entityType}-${namespace}`;
}

export const EntityStoreESQLSOType: SavedObjectsType = {
  name: ENTITY_STORE_EXECUTION_TIME_SO,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      lastExecutionTimeISO: { type: 'date' },
      config: {
        type: 'object',
        properties: {
          maxPageSearchSize: { type: 'integer' },
        },
      },
    },
  },
  management: {
    displayName: 'Entity Definition',
    importableAndExportable: false,
    getTitle(savedObject: SavedObject<EntityStoreStateAttributes>) {
      return `EntityDefinition: [${savedObject.attributes.entityType}]`;
    },
  },
  modelVersions: {
    '1': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            lastExecutionTimeISO: { type: 'date' },
            config: {
              type: 'object',
              properties: {
                maxPageSearchSize: { type: 'integer' },
              },
            },
          },
        },
      ],
    },
  },
};
