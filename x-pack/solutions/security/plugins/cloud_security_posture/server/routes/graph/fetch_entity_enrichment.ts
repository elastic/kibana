/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';

export interface EntityEnrichmentFields {
  name?: string | null;
  type?: string | null;
  subType?: string | null;
  hostIps?: string[];
  engineType?: string | null;
}

/** Chunks an array into subarrays of at most `size` elements. */
const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Fetches enrichment metadata for a set of entity IDs from the local entity store.
 * Always runs against the origin project's entity store (asInternalUser) — CPS-safe.
 * Returns an empty map when the entity store index does not exist or on error.
 */
export const fetchEntityEnrichment = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  entityIds: string[],
  spaceId: string
): Promise<Map<string, EntityEnrichmentFields>> => {
  if (entityIds.length === 0) {
    return new Map();
  }

  const indexName = getEntitiesLatestIndexName(spaceId);

  // Check index exists before querying
  try {
    const exists = await esClient.asInternalUser.indices.exists({ index: indexName });
    if (!exists) {
      logger.debug(`Entity store index [${indexName}] does not exist, skipping enrichment`);
      return new Map();
    }
  } catch (err) {
    logger.warn(`Failed to check entity store index [${indexName}]: ${err.message}`);
    return new Map();
  }

  const result = new Map<string, EntityEnrichmentFields>();

  for (const chunk of chunkArray([...new Set(entityIds)], 100)) {
    // Escape double-quotes in entity IDs to prevent ESQL injection
    const idList = chunk
      .map((id) => `"${String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
      .join(', ');
    const query = `FROM ${indexName}
| WHERE entity.id IN (${idList})
| KEEP entity.id, entity.name, entity.type, entity.sub_type, \`entity.EngineMetadata.Type\`, host.ip`;

    try {
      const response = await esClient.asInternalUser.helpers
        .esql({ columnar: false, query })
        .toRecords<{
          'entity.id': string;
          'entity.name'?: string | null;
          'entity.type'?: string | null;
          'entity.sub_type'?: string | null;
          'entity.EngineMetadata.Type'?: string | null;
          'host.ip'?: string | string[] | null;
        }>();

      for (const record of response.records) {
        const id = record['entity.id'];
        if (!id) continue;
        const rawHostIp = record['host.ip'];
        const hostIps =
          rawHostIp != null
            ? Array.isArray(rawHostIp)
              ? rawHostIp.map(String)
              : [String(rawHostIp)]
            : [];
        result.set(id, {
          name: record['entity.name'] ?? null,
          type: record['entity.type'] ?? null,
          subType: record['entity.sub_type'] ?? null,
          engineType: record['entity.EngineMetadata.Type'] ?? null,
          hostIps,
        });
      }
    } catch (err) {
      logger.warn(
        `Entity enrichment fetch failed for chunk of ${chunk.length} IDs: ${err.message}`
      );
      // Non-fatal: partial map returned, graph renders without enrichment for missing entities
    }
  }

  return result;
};
