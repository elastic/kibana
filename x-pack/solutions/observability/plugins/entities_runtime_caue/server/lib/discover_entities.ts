/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { buildEntityQuery, metadataIndexName } from '../../common/build_entity_query';
import type { MetadataFilter } from '../../common/metadata_filter';
import { ensureMetadataIndex } from './metadata_index';
import { getMetadataFields } from './metadata_fields';
import type { EntityDefinition, DiscoveredEntity } from '../../common/entity_definition';
import { validateIndexPattern } from './validate_index_pattern';

interface EsqlRow {
  'entity.id': string;
  first_seen: string | null;
  last_seen: string;
  doc_count: number;
  [key: string]: unknown;
}

/**
 * Core discovery flow for a single entity definition.
 *
 * 1. Ensure the per-definition metadata lookup index exists.
 * 2. Resolve the index pattern — return [] early if no indices match.
 * 3. Run the discovery ES|QL with LOOKUP JOIN to get entities + stored first_seen.
 * 4. Find rows where first_seen is null (new entities).
 * 5. If there are new entities, run the backfill ES|QL to get MIN(@timestamp).
 * 6. Bulk-write first_seen with op_type=create (first writer wins, race-safe).
 * 7. Patch first_seen into the result rows and return.
 */
export interface DiscoverEntitiesError {
  type: 'unknown_metadata_field';
  field: string;
}

export const discoverEntities = async ({
  definition,
  start,
  end,
  filter,
  metadataFilters,
  esClientCurrent,
  esClientInternal,
  logger,
}: {
  definition: EntityDefinition;
  start: string;
  end: string;
  filter?: unknown;
  metadataFilters?: MetadataFilter[];
  esClientCurrent: ElasticsearchClient;
  esClientInternal: ElasticsearchClient;
  logger: Logger;
}): Promise<DiscoveredEntity[] | DiscoverEntitiesError> => {
  // Validate index pattern (defensive; should already be validated on create)
  const validationError = validateIndexPattern(definition.indexPattern);
  if (validationError) {
    logger.warn(`[discover_entities] ${validationError}`);
    return [];
  }

  // 1. Ensure lookup index exists (self-heals if manually deleted)
  await ensureMetadataIndex(esClientInternal, definition.id);

  // 1b. Validate metadata filter fields against the actual mapping to prevent the hard
  //     "verification_exception: Unknown column" 400 that ES|QL throws when a field
  //     referenced in a post-JOIN WHERE doesn't exist in the lookup index.
  if (metadataFilters && metadataFilters.length > 0) {
    const knownFields = await getMetadataFields(esClientInternal, definition.id);
    const knownNames = new Set(knownFields.map((f) => f.name));
    for (const mf of metadataFilters) {
      if (!knownNames.has(mf.field)) {
        return { type: 'unknown_metadata_field', field: mf.field };
      }
    }
  }

  // 2. Resolve index pattern early to avoid the LOOKUP JOIN bug (kibana#277613):
  //    when FROM resolves to zero indices, LOOKUP JOIN throws "Lookup Join requires a single
  //    lookup mode index" instead of returning empty results.
  const resolved = await esClientCurrent.indices
    .resolveIndex({ name: definition.indexPattern, expand_wildcards: ['open'] })
    .catch(() => null);
  const hasIndices =
    resolved && ((resolved.indices?.length ?? 0) > 0 || (resolved.data_streams?.length ?? 0) > 0);
  if (!hasIndices) {
    logger.debug(
      `[discover_entities] index pattern "${definition.indexPattern}" matches no indices`
    );
    return [];
  }

  // 3. Discovery query with LOOKUP JOIN (and optional post-JOIN WHERE for metadata filters)
  const { query: discoveryQuery, params: discoveryParams } = buildEntityQuery({
    type: definition.type,
    identityFields: definition.identityFields,
    indexPattern: definition.indexPattern,
    start,
    end,
    mode: 'discovery',
    definitionId: definition.id,
    metadataFilters,
  });

  let discoveryRows: EsqlRow[] = [];
  try {
    const discoveryResult = await esClientCurrent.esql.query({
      query: discoveryQuery,
      params: discoveryParams,
      format: 'json',
      // KQL filter applied only to discovery — backfill stays unfiltered so first_seen is global
      ...(filter ? { filter } : {}),
    } as Parameters<typeof esClientCurrent.esql.query>[0]);

    discoveryRows = esqlToRows<EsqlRow>(discoveryResult);
  } catch (err: unknown) {
    logger.warn(`[discover_entities] discovery query failed: ${(err as Error).message}`);
    return [];
  }

  // 4. Find rows with null first_seen
  const newEntityIds = discoveryRows
    .filter((row) => row.first_seen === null || row.first_seen === undefined)
    .map((row) => row['entity.id']);

  // 5 + 6. Backfill first_seen for new entities
  const backfilledFirstSeen = new Map<string, string>();

  if (newEntityIds.length > 0) {
    // Determine lookback window start: now - lookbackPeriod
    const lookbackStart = computeLookbackStart(definition.lookbackPeriod);

    // Optimisation: if the UI start is already at or before the lookback start,
    // reuse MIN(@timestamp) from the discovery result (it's already as far back as lookback)
    const startMs = new Date(start).getTime();
    const lookbackMs = new Date(lookbackStart).getTime();

    if (startMs <= lookbackMs) {
      // Discovery window already covers the lookback — use discovery result's MIN
      for (const row of discoveryRows) {
        if (newEntityIds.includes(row['entity.id'])) {
          backfilledFirstSeen.set(
            row['entity.id'],
            (row as { discovery_min?: string }).discovery_min ?? row.last_seen
          );
        }
      }
    } else {
      // Run a separate backfill query over the full lookback window
      const { query: backfillQuery, params: backfillParams } = buildEntityQuery({
        type: definition.type,
        identityFields: definition.identityFields,
        indexPattern: definition.indexPattern,
        start: lookbackStart,
        end: new Date().toISOString(),
        mode: 'backfill',
        lookbackStart,
        definitionId: definition.id,
      });

      try {
        const backfillResult = await esClientCurrent.esql.query({
          query: backfillQuery,
          params: backfillParams,
          format: 'json',
        } as Parameters<typeof esClientCurrent.esql.query>[0]);

        const backfillRows = esqlToRows<{ 'entity.id': string; first_seen_min: string }>(
          backfillResult
        );
        for (const row of backfillRows) {
          if (newEntityIds.includes(row['entity.id'])) {
            backfilledFirstSeen.set(row['entity.id'], row.first_seen_min);
          }
        }
      } catch (err: unknown) {
        logger.warn(`[discover_entities] backfill query failed: ${(err as Error).message}`);
      }
    }

    // 6. Bulk-write first_seen with op_type=create (idempotent, race-safe)
    if (backfilledFirstSeen.size > 0) {
      const metaIndex = metadataIndexName(definition.id);
      const body: Array<Record<string, unknown>> = [];
      for (const [entityId, firstSeen] of backfilledFirstSeen.entries()) {
        body.push({ create: { _index: metaIndex, _id: entityId } });
        body.push({ 'entity.id': entityId, first_seen: firstSeen });
      }
      try {
        const bulkResp = await esClientInternal.bulk({ body, refresh: true });
        if (bulkResp.errors) {
          for (const item of bulkResp.items) {
            const op = item.create;
            if (op?.error && op.error.type !== 'version_conflict_engine_exception') {
              logger.warn(
                `[discover_entities] first_seen write failed for ${op._id}: ${op.error.reason}`
              );
            }
          }
        }
      } catch (err: unknown) {
        logger.warn(`[discover_entities] bulk first_seen write failed: ${(err as Error).message}`);
      }
    }
  }

  // 7. Build and return enriched result rows
  return discoveryRows.map((row) => {
    const entityId = row['entity.id'];
    const resolvedFirstSeen = row.first_seen ?? backfilledFirstSeen.get(entityId) ?? null;

    const identityValues: Record<string, string> = {};
    for (const field of definition.identityFields) {
      identityValues[field] = String(row[field] ?? '');
    }

    return {
      'entity.id': entityId,
      first_seen: resolvedFirstSeen,
      last_seen: String(row.last_seen),
      doc_count: Number(row.doc_count),
      identityValues,
    };
  });
};

/** Converts an ES|QL columnar response to an array of row objects. */
const esqlToRows = <T extends Record<string, unknown>>(response: {
  columns?: Array<{ name: string }>;
  values?: unknown[][];
}): T[] => {
  const cols = response.columns ?? [];
  return (response.values ?? []).map((row) => {
    const record: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      record[col.name] = row[i] ?? null;
    });
    return record as T;
  });
};

/** Computes the start of a lookback window from a duration string like '30d', '1h', '7d'. */
const computeLookbackStart = (lookbackPeriod: string): string => {
  const match = lookbackPeriod.match(/^(\d+)(d|h|m|s)$/);
  if (!match) {
    // Default to 30 days if unparseable
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  const [, amountStr, unit] = match;
  const amount = parseInt(amountStr, 10);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() - amount * unitMs[unit]).toISOString();
};
