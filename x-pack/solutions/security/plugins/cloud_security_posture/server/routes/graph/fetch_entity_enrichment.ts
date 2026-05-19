/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { checkIfEntitiesIndexExists } from './utils';
import { GRAPH_ACTOR_EUID_SOURCE_FIELDS, TYPED_ENTITY_PREFIXES } from './constants';

export interface EntityEnrichmentFields {
  name?: string | null;
  type?: string | null;
  subType?: string | null;
  hostIps?: string[];
  engineType?: string | null;
  sourceFields?: Record<string, string | string[]>;
}

const BASE_ENRICHMENT_COLUMNS = new Set([
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.sub_type',
  'entity.EngineMetadata.Type',
  'host.ip',
]);

// Additional entity-store columns needed to reconstruct sourceFields, beyond the base set.
// Deduped; strips ".target" suffix so actor-namespace definitions map to store column names.
const EXTRA_SOURCE_FIELD_COLUMNS = [
  ...new Set(
    [
      ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.all,
      ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.user,
      ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.host,
      ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.service,
      ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic,
    ].map((f) => f.replace('.target', ''))
  ),
].filter((col) => !BASE_ENRICHMENT_COLUMNS.has(col));

/**
 * Builds a sourceFields object for an entity from its entity-store record columns.
 * Mirrors the type-conditional logic in buildSourceFieldsJson: typed entities get their
 * own type's fields, generic entities get the generic bucket, all entities get the "all" bucket.
 */
const buildSourceFields = (
  entityId: string,
  record: Record<string, unknown>
): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {};

  const addField = (col: string): void => {
    const val = record[col];
    if (val == null) return;
    result[col] = Array.isArray(val) ? (val as string[]).map(String) : String(val);
  };

  for (const field of GRAPH_ACTOR_EUID_SOURCE_FIELDS.all) {
    addField(field.replace('.target', ''));
  }

  const matchedType = TYPED_ENTITY_PREFIXES.find((p) => entityId.startsWith(`${p}:`));
  if (matchedType) {
    for (const field of GRAPH_ACTOR_EUID_SOURCE_FIELDS[matchedType]) {
      addField(field.replace('.target', ''));
    }
  } else {
    for (const field of GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic) {
      addField(field.replace('.target', ''));
    }
  }

  return result;
};

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
      // Some entity-store mappings (e.g. tests inserting minimal entities) omit columns we
      // KEEP below. unmapped_fields=nullify makes ESQL return NULL for those instead of erroring.
      const query = `SET unmapped_fields="nullify";
FROM ${indexName}
| WHERE entity.id IN (${paramNames})
| KEEP entity.id, entity.name, entity.type, entity.sub_type, \`entity.EngineMetadata.Type\`, host.ip${
        EXTRA_SOURCE_FIELD_COLUMNS.length > 0 ? ', ' + EXTRA_SOURCE_FIELD_COLUMNS.join(', ') : ''
      }`;

      try {
        const response = await esClient.asInternalUser.helpers
          .esql({
            columnar: false,
            query,
            // @ts-ignore - types are not up to date
            params: chunk.map((id, i) => ({ [`entityId${i}`]: id })),
          })
          .toRecords<
            {
              'entity.id': string;
              'entity.name'?: string | null;
              'entity.type'?: string | null;
              'entity.sub_type'?: string | null;
              'entity.EngineMetadata.Type'?: string | null;
              'host.ip'?: string | string[] | null;
            } & Record<string, unknown>
          >();

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
            const sourceFields = buildSourceFields(id, record);
            result.set(id, {
              name: record['entity.name'] ?? null,
              type: record['entity.type'] ?? null,
              subType: record['entity.sub_type'] ?? null,
              engineType: record['entity.EngineMetadata.Type'] ?? null,
              hostIps,
              ...(Object.keys(sourceFields).length > 0 ? { sourceFields } : {}),
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
