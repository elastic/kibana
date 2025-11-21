/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';

// Saved Object Type and Mapping
export const ENTITY_STORE_EXECUTION_TIME_SO = 'entity-store-esql-execution-time';

export interface EntityStoreStateAttributes {
  entityType: EntityType;
  lastExecutionTimeISO: string | null;
}

export async function getEntityStoreState(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string
): Promise<EntityStoreStateAttributes> {
  const id = getEntityTypeSavedObjectId(entityType, namespace);
  try {
    const so = await soClient.get<EntityStoreStateAttributes>(ENTITY_STORE_EXECUTION_TIME_SO, id);
    return so.attributes;
  } catch (e) {
    return { entityType, lastExecutionTimeISO: null };
  }
}

export async function updateEntityStoreLastExecutionTime(
  soClient: SavedObjectsClientContract,
  entityType: EntityType,
  namespace: string,
  lastExecutionTimeISO: string
): Promise<void> {
  const id = getEntityTypeSavedObjectId(entityType, namespace);
  try {
    await soClient.create<EntityStoreStateAttributes>(
      ENTITY_STORE_EXECUTION_TIME_SO,
      { entityType, lastExecutionTimeISO },
      { id, overwrite: true }
    );
  } catch (createError) {
    try {
      await soClient.update<EntityStoreStateAttributes>(ENTITY_STORE_EXECUTION_TIME_SO, id, {
        entityType,
        lastExecutionTimeISO,
      });
    } catch (updateError) {
      throw new Error(
        `Failed to update entity store latest execution time for type ${entityType}, (${JSON.stringify(
          {
            createError,
            updateError,
          }
        )})`
      );
    }
  }
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
    },
  },
  management: {
    displayName: 'Entity Definition',
    importableAndExportable: false,
    getTitle(savedObject: SavedObject<EntityStoreStateAttributes>) {
      return `EntityDefinition: [${savedObject.attributes.entityType}]`;
    },
  },
  modelVersions: {},
};
