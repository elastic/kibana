/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { AssetProps } from '@kbn/cloud-security-posture-common';
import type { MappedAssetProps } from '@kbn/cloud-security-posture-common/types/assets';

/**
 * Maps response fields to their corresponding entity fields
 * This makes the relationship between MappedAssetProps and AssetProps explicit
 */
type EntityFieldMapper = Record<keyof MappedAssetProps, keyof AssetProps>;

/**
 * Field mapping from response fields to entity fields
 */
const ASSET_RESPONSE_TO_ENTITY_FIELD: EntityFieldMapper = {
  entityName: 'entity.name',
  entityType: 'entity.type',
};

/**
 * ID field name constant - used to identify entities
 */
const ENTITY_ID_FIELD = 'entity.id' as keyof AssetProps;

/**
 * Maps an entity record from the source format to the simplified response format
 * @param record The source entity record
 * @returns A simplified asset response or undefined if the record is invalid
 */
const mapEntityToResponseObject = (record: AssetProps): [string, MappedAssetProps] | undefined => {
  const entityId = record[ENTITY_ID_FIELD];

  if (!entityId) {
    return undefined;
  }

  // Build response by mapping each field according to ASSET_RESPONSE_TO_ENTITY_FIELD
  const assetResponse = Object.entries(ASSET_RESPONSE_TO_ENTITY_FIELD).reduce<
    Partial<MappedAssetProps>
  >((response, [responseField, entityField]) => {
    // Check if the entity field exists in the record
    if (entityField in record) {
      const value = record[entityField] as string;

      // Set the field only if it has a value
      if (value) {
        response[responseField as keyof MappedAssetProps] = value;
      }
    }
    return response;
  }, {}) as MappedAssetProps;

  // Return tuple of [entityId, simplified asset response]
  return [entityId as string, assetResponse];
};

/**
 * Fetches entity data from the entities index for a given set of entity IDs
 *
 * @param esClient Elasticsearch client
 * @param logger Logger
 * @param entityIds Array of entity IDs to fetch data for
 * @returns A record mapping entity IDs to their entity data
 */
export async function fetchEntityData(
  esClient: IScopedClusterClient,
  logger: Logger,
  entityIds: string[],
  spaceId: string
): Promise<Record<string, MappedAssetProps>> {
  if (entityIds.length === 0) {
    return {};
  }

  logger.debug(`Fetching entity data for ${entityIds.length} entities`);
  // Use ESQL to query entity data
  const esqlQuery = `FROM .entities.*.latest.security_*_${spaceId}
| WHERE entity.id IN (${entityIds.map((_, idx) => `?entity_id${idx}`).join(', ')})
| LIMIT ${entityIds.length * 2}`;

  const params = entityIds.map((id, idx) => ({
    [`entity_id${idx}`]: id,
  }));

  try {
    const results = await esClient.asCurrentUser.helpers
      .esql({
        columnar: false,
        query: esqlQuery,
        // @ts-ignore - types are not up to date
        params,
      })
      .toRecords<AssetProps>();

    // Transform results into a map of entity id -> entity data
    const entityDataMap: Record<string, MappedAssetProps> = {};
    for (const record of results.records) {
      const mappedEntity = mapEntityToResponseObject(record);
      if (mappedEntity) {
        const [entityId, assetResponse] = mappedEntity;
        entityDataMap[entityId] = assetResponse;
      }
    }

    logger.debug(
      `Successfully fetched data for ${Object.keys(entityDataMap).length}/${
        entityIds.length
      } entities`
    );
    return entityDataMap;
  } catch (error) {
    logger.error(`Error fetching entity data: ${error}`);
    throw error;
  }
}
