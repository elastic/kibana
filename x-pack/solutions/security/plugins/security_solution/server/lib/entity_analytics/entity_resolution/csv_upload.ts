/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import Papa from 'papaparse';
import type { Logger } from '@kbn/logging';
import type { EntityStoreCRUDClient, ResolutionClient } from '@kbn/entity-store/server';
import { ENGINE_METADATA_TYPE_FIELD, getFieldValue } from '@kbn/entity-store/server';
import type {
  ResolutionCsvUploadRowResponse,
  ResolutionCsvUploadResponse,
} from '../../../../common/entity_analytics/entity_store/resolution_csv_upload';
import {
  RESOLUTION_CSV_VALID_ENTITY_TYPES,
  RESOLUTION_CSV_REQUIRED_COLUMNS,
} from '../../../../common/entity_analytics/entity_store/resolution_csv_upload';

export type { ResolutionCsvUploadRowResponse, ResolutionCsvUploadResponse };

const VALID_ENTITY_TYPES = new Set(RESOLUTION_CSV_VALID_ENTITY_TYPES);
const RESERVED_COLUMNS = new Set(RESOLUTION_CSV_REQUIRED_COLUMNS);
const ENTITY_SEARCH_PAGE_SIZE = 100;
const MAX_MATCHED_ENTITIES = 1000;
const ENTITY_ID_FIELD = 'entity.id';
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

interface CsvResolutionUploadDeps {
  crudClient: EntityStoreCRUDClient;
  resolutionClient: ResolutionClient;
  logger: Logger;
}

interface ValidRow {
  valid: true;
  type: string;
  resolvedTo: string;
  identityFields: Record<string, string>;
}

interface InvalidRow {
  valid: false;
  error: string;
}

type TargetCacheEntry = { valid: true } | { valid: false; error: string };

export async function processResolutionCsvUpload(
  fileStream: Readable,
  deps: CsvResolutionUploadDeps
): Promise<ResolutionCsvUploadResponse> {
  const rows = await parseCsvRows(fileStream);
  const targetCache = new Map<string, TargetCacheEntry>();
  const items: ResolutionCsvUploadRowResponse[] = [];

  for (const row of rows) {
    const result = await processRow(row, deps, targetCache);
    items.push(result);
  }

  return {
    total: items.length,
    successful: items.filter((i) => i.status === 'success').length,
    failed: items.filter((i) => i.status === 'error').length,
    unmatched: items.filter((i) => i.status === 'unmatched').length,
    items,
  };
}

async function parseCsvRows(fileStream: Readable): Promise<Array<Record<string, string>>> {
  const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
    transform: (v: string) => v.trim(),
  });

  const rows: Array<Record<string, string>> = [];
  const readable = fileStream.pipe(csvStream);

  for await (const row of readable) {
    rows.push(row as Record<string, string>);
  }

  return rows;
}

function validateRow(row: Record<string, string>): ValidRow | InvalidRow {
  const type = row.type;
  const resolvedTo = row.resolved_to;

  if (!type || !VALID_ENTITY_TYPES.has(type)) {
    return {
      valid: false,
      error: `Invalid entity type: '${type ?? ''}'. Must be one of: user, host, service, generic`,
    };
  }

  if (!resolvedTo) {
    return { valid: false, error: 'Missing resolved_to value' };
  }

  const identityFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!RESERVED_COLUMNS.has(key) && value) {
      identityFields[key] = value;
    }
  }

  if (Object.keys(identityFields).length === 0) {
    return { valid: false, error: 'No identifying fields provided' };
  }

  return { valid: true, type, resolvedTo, identityFields };
}

async function resolveTarget(
  resolvedTo: string,
  deps: CsvResolutionUploadDeps,
  cache: Map<string, TargetCacheEntry>
): Promise<TargetCacheEntry> {
  const cached = cache.get(resolvedTo);
  if (cached) {
    return cached;
  }

  const { entities } = await deps.crudClient.listEntities({
    filter: [{ term: { [ENTITY_ID_FIELD]: resolvedTo } }],
    source: [ENTITY_ID_FIELD, RESOLVED_TO_FIELD],
    size: 1,
  });

  if (entities.length === 0) {
    const entry: TargetCacheEntry = {
      valid: false,
      error: `Target entity '${resolvedTo}' not found`,
    };
    cache.set(resolvedTo, entry);
    return entry;
  }

  const targetResolvedTo = getFieldValue(entities[0], RESOLVED_TO_FIELD);

  if (targetResolvedTo) {
    const entry: TargetCacheEntry = {
      valid: false,
      error: `Target entity '${resolvedTo}' is an alias of '${targetResolvedTo}'`,
    };
    cache.set(resolvedTo, entry);
    return entry;
  }

  const entry: TargetCacheEntry = { valid: true };
  cache.set(resolvedTo, entry);
  return entry;
}

async function findMatchingEntities(
  type: string,
  identityFields: Record<string, string>,
  targetId: string,
  deps: CsvResolutionUploadDeps
): Promise<string[]> {
  const queryFilters = [
    { term: { [ENGINE_METADATA_TYPE_FIELD]: type } },
    ...Object.entries(identityFields).map(([field, value]) => ({
      term: { [field]: value },
    })),
  ];

  const entityIds: string[] = [];
  let searchAfter: Array<string | number> | undefined;

  do {
    const { entities, nextSearchAfter } = await deps.crudClient.listEntities({
      filter: queryFilters,
      source: [ENTITY_ID_FIELD],
      size: ENTITY_SEARCH_PAGE_SIZE,
      searchAfter,
    });

    for (const entity of entities) {
      const entityId = getFieldValue(entity, ENTITY_ID_FIELD);
      if (entityId && entityId !== targetId) {
        entityIds.push(entityId);
      }
    }

    if (entityIds.length > MAX_MATCHED_ENTITIES) {
      throw new Error(
        `Matched more than ${MAX_MATCHED_ENTITIES} entities. Narrow your identifying fields to be more specific.`
      );
    }

    searchAfter = nextSearchAfter;
  } while (searchAfter);

  return entityIds;
}

async function processRow(
  row: Record<string, string>,
  deps: CsvResolutionUploadDeps,
  targetCache: Map<string, TargetCacheEntry>
): Promise<ResolutionCsvUploadRowResponse> {
  const errorResult = (error: string): ResolutionCsvUploadRowResponse => ({
    status: 'error',
    matchedEntities: 0,
    linkedEntities: 0,
    skippedEntities: 0,
    error,
  });

  // 1. Validate row
  const validation = validateRow(row);
  if (!validation.valid) {
    return errorResult(validation.error);
  }

  const { type, resolvedTo, identityFields } = validation;

  // 2. Resolve target (cached)
  const targetResult = await resolveTarget(resolvedTo, deps, targetCache);
  if (!targetResult.valid) {
    return errorResult(targetResult.error);
  }

  // 3. Find alias matches
  let matchedEntityIds: string[];
  try {
    matchedEntityIds = await findMatchingEntities(type, identityFields, resolvedTo, deps);
  } catch (e) {
    return errorResult(e instanceof Error ? e.message : String(e));
  }

  if (matchedEntityIds.length === 0) {
    return { status: 'unmatched', matchedEntities: 0, linkedEntities: 0, skippedEntities: 0 };
  }

  // 4. Link matches
  try {
    const { linked, skipped } = await deps.resolutionClient.linkEntities(
      resolvedTo,
      matchedEntityIds
    );
    return {
      status: 'success',
      matchedEntities: matchedEntityIds.length,
      linkedEntities: linked.length,
      skippedEntities: skipped.length,
    };
  } catch (e) {
    return {
      status: 'error',
      matchedEntities: matchedEntityIds.length,
      linkedEntities: 0,
      skippedEntities: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
