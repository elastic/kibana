/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { castArray } from 'lodash';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import { resolveLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type { EntityEnrichmentFields } from '../fetch_entity_enrichment';

/**
 * SHA-256 hash of a sorted, comma-joined id list. Used to derive a stable node id when
 * multiple entity ids collapse into a single graph node (group node, label node).
 * Input is sorted internally so callers don't need to remember.
 */
export const hashIds = (ids: string[]): string =>
  createHash('sha256')
    .update([...ids].sort().join(','))
    .digest('hex');

/**
 * Unions an ES|QL multi-value column (scalar | array | null | undefined) into a target Set.
 * Used by the regroup* functions to merge the VALUES(...) aggregates of pre-aggregated rows.
 * `dropEmpty` additionally excludes the empty-string sentinel ES|QL emits for missing values —
 * set it for doc id / doc-data columns to match the original `if (record.x)` falsy guards.
 */
export const addValuesToSet = (
  set: Set<string>,
  value: string | string[] | null | undefined,
  { dropEmpty }: { dropEmpty: boolean }
): void => {
  for (const v of castArray(value ?? [])) {
    if (v == null) continue;
    if (dropEmpty && v === '') continue;
    set.add(v);
  }
};

/**
 * Filters a multi-value doc-data column (JSON strings built by the ES|QL CONCAT expression)
 * to only the entries whose embedded "id" field is in the allowed set. Used to attribute a
 * shared STATS row's doc-data to a specific entity-type group without leaking across groups.
 * Each entry has the shape: {"id":"<entityId>","type":"entity",...}
 */
export const filterDocDataToIds = (
  docData: string | string[],
  allowedIds: Set<string>
): string[] => {
  const entries = castArray(docData ?? []);
  return entries.filter((entry) => {
    if (!entry) return false;
    try {
      const parsed = JSON.parse(entry) as { id?: string };
      return parsed.id != null && allowedIds.has(parsed.id);
    } catch {
      return false;
    }
  });
};

/**
 * Resolves the concrete entities latest index name to query, or null when no
 * live index exists for the space. Legacy-aware: un-migrated deployments still
 * hold `.entities.v2.latest.security_{space}` while the
 * `entityStore.migrateLegacySecurityAssets` feature flag is off, and LOOKUP JOIN
 * consumers need whichever concrete name is live.
 */
export const resolveEntitiesIndexName = async (
  esClient: IScopedClusterClient,
  logger: Logger,
  spaceId: string
): Promise<string | null> => {
  try {
    const indexName = await resolveLatestEntitiesIndexName(esClient.asInternalUser, spaceId);
    const exists = await esClient.asInternalUser.indices.exists({ index: indexName });
    if (!exists) {
      logger.debug(`Entities index ${indexName} does not exist`);
      return null;
    }
    return indexName;
  } catch (error) {
    logger.error(`Error resolving entities index for space ${spaceId}: ${error.message}`);
    return null;
  }
};

type SourceFieldsRecord = Record<string, string | string[]>;

/** Reads a doc's sourceFields, which may sit at the top level (events docData) or inside `entity`. */
const readSourceFields = (doc: Record<string, unknown>): SourceFieldsRecord | undefined => {
  const topLevel = doc.sourceFields;
  if (topLevel != null) return topLevel as SourceFieldsRecord;
  const entity = doc.entity as Record<string, unknown> | undefined;
  return entity?.sourceFields as SourceFieldsRecord | undefined;
};

/**
 * Unions the per-field values of several sourceFields records into one.
 * Fields that resolve to a single value stay scalars so only genuinely multi-value
 * fields become arrays. Insertion order of both fields and values is preserved.
 */
const unionSourceFields = (records: Array<SourceFieldsRecord | undefined>): SourceFieldsRecord => {
  const valuesByField = new Map<string, Set<string>>();
  for (const record of records) {
    for (const [field, value] of Object.entries(record ?? {})) {
      let values = valuesByField.get(field);
      if (!values) {
        values = new Set<string>();
        valuesByField.set(field, values);
      }
      addValuesToSet(values, value, { dropEmpty: true });
    }
  }
  const merged: SourceFieldsRecord = {};
  for (const [field, values] of valuesByField) {
    if (values.size === 0) continue;
    merged[field] = values.size === 1 ? [...values][0] : [...values];
  }
  return merged;
};

/**
 * Rebuilds doc data JSON strings with enrichment data from the entity store, emitting exactly
 * one entry per entity id.
 *
 * MV_EXPAND expands each multi-value identity field independently, so a single event yields a
 * Cartesian product of rows: one entity id appears many times, each carrying a different
 * combination of sourceField values. Keeping any single row would attribute another entity's
 * values to this id, so the rows for an id are grouped and their sourceFields unioned per field.
 * The union drops the bogus pairings while keeping every real value, since every individual value
 * did occur in the source event.
 *
 * sourceFields always describe the *event* fields that pointed at the entity, never the entity
 * store's own identity fields — consumers use them to query `logs-*`, so a field the events do
 * not carry (or an entity-store-normalized value) would not match anything. Enrichment therefore
 * contributes only entity metadata (name/type/sub_type/engine_type/host.ip) and is used as the
 * sourceFields source solely when the doc carries none of its own (relationship target docData).
 *
 * Narrowing this union to the single EUID-composing field per the entity type's ranking is
 * tracked separately in https://github.com/elastic/kibana/issues/262882 — all identifier fields
 * are returned here so that selection can happen there.
 *
 * Docs that fail to parse or carry no id are returned unchanged.
 */
export const rebuildDocData = (
  docDataItems: (string | null)[] | string | undefined,
  enrichmentMap: Map<string, EntityEnrichmentFields>
): string[] => {
  const items = castArray(docDataItems ?? []).filter((d): d is string => d != null);

  // Group by entity id, preserving first-seen order. Unparseable / id-less entries are passed
  // through verbatim in place.
  const passthrough = new Map<number, string>();
  const docsById = new Map<string, Array<Record<string, unknown>>>();
  const orderedKeys: Array<{ index: number } | { entityId: string }> = [];

  items.forEach((item, index) => {
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(item);
    } catch {
      passthrough.set(index, item);
      orderedKeys.push({ index });
      return;
    }
    const entityId = doc.id as string | undefined;
    if (!entityId) {
      passthrough.set(index, item);
      orderedKeys.push({ index });
      return;
    }
    const existing = docsById.get(entityId);
    if (existing) {
      existing.push(doc);
      return;
    }
    docsById.set(entityId, [doc]);
    orderedKeys.push({ entityId });
  });

  return orderedKeys.map((key) => {
    if ('index' in key) return passthrough.get(key.index) as string;

    const { entityId } = key;
    const docs = docsById.get(entityId) as Array<Record<string, unknown>>;
    // The first row carries the doc-level fields (id, type, index); later rows differ only in
    // their sourceField combination.
    const doc = docs[0];
    const enrichment = enrichmentMap.get(entityId);

    // Event-derived fields win: they are what `logs-*` documents actually contain. Enrichment
    // sourceFields are only a fallback for docs that carry none (relationship target docData).
    const unionedSourceFields = unionSourceFields(docs.map(readSourceFields));
    const sourceFields =
      Object.keys(unionedSourceFields).length > 0 ? unionedSourceFields : enrichment?.sourceFields;

    const entityData: Record<string, unknown> = {
      availableInEntityStore: enrichment != null,
      ...(sourceFields ? { sourceFields } : {}),
    };

    if (enrichment?.name != null) entityData.name = enrichment.name;
    if (enrichment?.type != null) entityData.type = enrichment.type;
    if (enrichment?.subType != null) entityData.sub_type = enrichment.subType;
    if (enrichment?.engineType != null) entityData.engine_type = enrichment.engineType;
    if (enrichment?.hostIps?.length) entityData.host = { ip: enrichment.hostIps };

    delete doc.sourceFields;
    doc.entity = entityData;
    return JSON.stringify(doc);
  });
};
