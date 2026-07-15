/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import pRetry from 'p-retry';
import type { errors as EsErrors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { GRAPH_ACTOR_EUID_SOURCE_FIELDS, TYPED_ENTITY_PREFIXES } from './constants';

export interface EntityEnrichmentFields {
  name?: string | null;
  type?: string | null;
  subType?: string | null;
  hostIps?: string[];
  engineType?: string | null;
  sourceFields?: Record<string, string | string[]>;
}

// Capped at 1000 to stay under Elasticsearch's dynamic boolean-clause limit
// (heuristic min 1024). Same precedent as alerting's MAX_RULES_IDS_IN_RETRY.
const ENRICHMENT_CHUNK_SIZE = 1000;

const BASE_ENRICHMENT_COLUMNS = new Set([
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.sub_type',
  'entity.EngineMetadata.Type',
  'host.ip',
]);

// Additional entity-store columns needed to reconstruct sourceFields, beyond the base set.
const EXTRA_SOURCE_FIELD_COLUMNS = [
  ...new Set([
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.all,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.user,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.host,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.service,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic,
  ]),
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
    addField(field);
  }

  const matchedType = TYPED_ENTITY_PREFIXES.find((p) => entityId.startsWith(`${p}:`));
  if (matchedType) {
    for (const field of GRAPH_ACTOR_EUID_SOURCE_FIELDS[matchedType]) {
      addField(field);
    }
  } else {
    for (const field of GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic) {
      addField(field);
    }
  }

  return result;
};

/**
 * Fetches enrichment metadata for a set of entity IDs from the local entity store.
 *
 * Uses asInternalUser (not asCurrentUser) to always target the origin project's local
 * entity store, bypassing any CPS routing that might redirect asCurrentUser queries to
 * remote indices. The parent route is already authz-gated, so this is safe.
 *
 * `entityStoreIndexExists` is the result of a single upstream existence check
 * (see fetchGraph). Returns an empty map when the index is absent or no IDs were given.
 *
 * Atomic: chunks run in parallel and each is wrapped in `p-retry` for the standard
 * Kibana transient-ES retry behavior (matches the pattern used by event_log / fleet /
 * cases). Retries only on `isRetryableEsClientError` (NoLivingConnections /
 * ConnectionError / TimeoutError / 408/410/429/502/503/504); other errors short-circuit
 * via `onFailedAttempt` so authz/validation failures don't get retried. If a chunk still
 * fails after retries, the rejection propagates and the caller's graph request fails —
 * matching the original LOOKUP JOIN all-or-nothing semantics and avoiding silent
 * type/subtype group drift in downstream regroup* logic.
 */
export const fetchEntityEnrichment = async ({
  esClient,
  logger,
  entityIds,
  spaceId,
  entityStoreIndexExists,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  entityIds: string[];
  spaceId: string;
  entityStoreIndexExists: boolean;
}): Promise<Map<string, EntityEnrichmentFields>> => {
  if (entityIds.length === 0 || !entityStoreIndexExists) {
    return new Map();
  }

  const indexName = getEntitiesLatestIndexName(spaceId);
  const result = new Map<string, EntityEnrichmentFields>();

  await Promise.all(
    chunk([...new Set(entityIds)], ENRICHMENT_CHUNK_SIZE).map(async (entityIdChunk) => {
      const paramNames = entityIdChunk.map((_, i) => `?entityId${i}`).join(', ');
      // Some entity-store mappings (e.g. tests inserting minimal entities) omit columns we
      // KEEP below. unmapped_fields=nullify makes ESQL return NULL for those instead of erroring.
      const query = `SET unmapped_fields="nullify";
FROM ${indexName}
| WHERE entity.id IN (${paramNames})
| KEEP entity.id, entity.name, entity.type, entity.sub_type, \`entity.EngineMetadata.Type\`, host.ip${
        EXTRA_SOURCE_FIELD_COLUMNS.length > 0 ? ', ' + EXTRA_SOURCE_FIELD_COLUMNS.join(', ') : ''
      }`;

      const response = await pRetry(
        () =>
          esClient.asInternalUser.helpers
            .esql({
              columnar: false,
              query,
              params: entityIdChunk.map((id, i) => ({ [`entityId${i}`]: id })),
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
            >(),
        {
          // Same retry shape used by event_log / alerting (~2s, 4s, 8s with jitter,
          // capped at 30s, total 4 attempts).
          minTimeout: 2000,
          maxTimeout: 30000,
          retries: 3,
          factor: 2,
          randomize: true,
          onFailedAttempt: (err) => {
            // Re-throwing here aborts further retries — used to skip non-transient
            // errors (authz, validation, etc.). p-retry preserves the thrown error,
            // so the underlying ES error shape is intact; isRetryableEsClientError
            // uses instanceof checks and safely returns false for non-ES errors.
            if (!isRetryableEsClientError(err as unknown as EsErrors.ElasticsearchClientError)) {
              throw err;
            }
            logger.warn(
              `Retrying entity enrichment after transient ES error: ${err.message} (${err.retriesLeft} retries left)`
            );
          },
        }
      );

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
    })
  );

  return result;
};
