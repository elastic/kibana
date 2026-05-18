/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { checkIfEntitiesIndexExists } from './utils';

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
 *
 * Uses asInternalUser (not asCurrentUser) to always target the origin project's local
 * entity store, bypassing any CPS routing that might redirect asCurrentUser queries to
 * remote indices. The parent route is already authz-gated, so this is safe.
 *
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

  const exists = await checkIfEntitiesIndexExists(esClient, logger, spaceId);
  if (!exists) {
    logger.debug(`Entity store index does not exist for space [${spaceId}], skipping enrichment`);
    return new Map();
  }

  const result = new Map<string, EntityEnrichmentFields>();

  // Chunks run in parallel. If one chunk fails, its entities get availableInEntityStore=false
  // while other chunks' entities remain enriched. This can split a previously-coherent
  // type/subtype group — a known behavioral edge case documented in the CPS refactor.
  await Promise.all(
    chunkArray([...new Set(entityIds)], 100).map(async (chunk) => {
      const paramNames = chunk.map((_, i) => `?entityId${i}`).join(', ');
      const query = `FROM ${indexName}
| WHERE entity.id IN (${paramNames})
| KEEP entity.id, entity.name, entity.type, entity.sub_type, \`entity.EngineMetadata.Type\`, host.ip`;

      try {
        const response = await esClient.asInternalUser.helpers
          .esql({
            columnar: false,
            query,
            // @ts-ignore - types are not up to date
            params: chunk.map((id, i) => ({ [`entityId${i}`]: id })),
          })
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
          if (!result.has(id)) {
            // First-seen wins; entity.id should be unique but may appear across namespaces
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
        }
      } catch (err) {
        logger.warn(
          `Entity enrichment fetch failed for chunk of ${chunk.length} IDs: ${err.message}`
        );
        // Non-fatal: partial map returned, graph renders without enrichment for missing entities
      }
    })
  );

  return result;
};
