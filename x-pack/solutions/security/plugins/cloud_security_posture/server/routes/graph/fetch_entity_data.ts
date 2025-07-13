/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { AssetProps } from '@kbn/cloud-security-posture-common';

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
  entityIds: string[]
): Promise<Record<string, AssetProps>> {
  if (entityIds.length === 0) {
    return {};
  }

  logger.debug(`Fetching entity data for ${entityIds.length} entities`);

  // Use ESQL to query entity data
  const esqlQuery = `FROM .entities.*.latest.security_*_default
| WHERE entity.id IN (${entityIds.map((_, idx) => `?entity_id${idx}`).join(', ')})
| LIMIT ${entityIds.length * 2}`; // Allow for some duplicates

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
    const entityDataMap: Record<string, AssetProps> = {};
    for (const record of results.records) {
      if (record['entity.id']) {
        // Filter out null and undefined values
        const cleanedRecord = Object.fromEntries(
          Object.entries(record as Record<string, any>).filter(([_, value]) => value != null)
        ) as AssetProps;
        entityDataMap[record['entity.id']] = cleanedRecord;
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
