/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { assertNoBulkErrors } from './bulk';
import { readJsonFromFile } from './fs_utils';
import { formatError, getStatusCode, isRecord, isString } from './type_guards';

const INDEX_FIELDS_LIMIT = 6000;

const mappingCache = new Map<string, MappingTypeMapping>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatusCode = (e: unknown): number | undefined => {
  return getStatusCode(e);
};

const getRootCauseTypes = (e: unknown): string[] => {
  if (!isRecord(e)) return [];
  const meta = e.meta;
  if (!isRecord(meta)) return [];
  const body = meta.body;
  if (!isRecord(body)) return [];
  const error = body.error;
  if (!isRecord(error)) return [];
  const root = error.root_cause;
  if (!Array.isArray(root)) return [];
  return root
    .map((c) => (isRecord(c) ? c.type : undefined))
    .filter((t): t is string => isString(t) && t.length > 0);
};

const getErrorType = (e: unknown): string | undefined => {
  if (!isRecord(e)) return undefined;
  const meta = e.meta;
  if (!isRecord(meta)) return undefined;
  const body = meta.body;
  if (!isRecord(body)) return undefined;
  const error = body.error;
  if (!isRecord(error)) return undefined;
  const type = error.type;
  return isString(type) ? type : undefined;
};

const isNoShardAvailable503 = (e: unknown): boolean => {
  if (getErrorStatusCode(e) !== 503) return false;

  const rootTypes = getRootCauseTypes(e);
  return (
    getErrorType(e) === 'search_phase_execution_exception' ||
    rootTypes.includes('no_shard_available_action_exception')
  );
};

const waitForIndexSearchable = async ({
  esClient,
  index,
  log,
  timeoutMs = 90_000,
}: {
  esClient: Client;
  index: string;
  log: ToolingLog;
  timeoutMs?: number;
}) => {
  const start = Date.now();
  let attempt = 0;

  while (Date.now() - start < timeoutMs) {
    try {
      // `_count` is lightweight and allowed in serverless mode; it will 503 while shards are unavailable.
      await esClient.count({ index });
      return;
    } catch (e) {
      if (!isNoShardAvailable503(e)) throw e;
      attempt++;
      const delayMs = Math.min(5000, 250 * attempt);
      if (attempt === 1) {
        log.warning(
          `Index ${index} is not searchable yet (no shards available). Waiting up to ${Math.round(
            timeoutMs / 1000
          )}s...`
        );
      }
      await sleep(delayMs);
    }
  }

  const diagnostics: string[] = [];

  try {
    // Serverless-friendly: `_cat/indices` is allowed and shows red/yellow/green.
    const cat = await esClient.transport.request<string>({
      method: 'GET',
      path: `/_cat/indices/${encodeURIComponent(index)}`,
      querystring: { v: 'true' },
    });
    diagnostics.push(`_cat/indices:\n${cat}`);
  } catch (e) {
    diagnostics.push(`_cat/indices failed: ${formatError(e)}`);
  }

  try {
    // Serverless-friendly: `_health_report` is the supported replacement for cluster health APIs.
    const report = await esClient.transport.request({
      method: 'GET',
      path: '/_health_report/shards_availability',
    });
    diagnostics.push(`_health_report/shards_availability:\n${JSON.stringify(report, null, 2)}`);
  } catch (e) {
    diagnostics.push(`_health_report/shards_availability failed: ${formatError(e)}`);
  }

  throw new Error(
    `Index ${index} is not searchable after ${Math.round(
      timeoutMs / 1000
    )}s (no shards available). ` +
      `This indicates primary shard allocation is stuck in Elasticsearch serverless.\n\n` +
      `Diagnostics:\n${diagnostics.join('\n\n')}\n\n` +
      `Try rerunning with a different prefix (e.g. --indexPrefix logs-endpoint_generator) or reset your local serverless ES state if the report indicates capacity/disk/shard limits.`
  );
};

const isMappingTypeMapping = (value: unknown): value is MappingTypeMapping => {
  // MappingTypeMapping is a broad structural type; we validate minimally to avoid passing non-objects.
  return typeof value === 'object' && value !== null;
};

const readMappingJsonCached = (mappingPath: string): MappingTypeMapping => {
  const cached = mappingCache.get(mappingPath);
  if (cached) return cached;
  const parsed: unknown = readJsonFromFile(mappingPath);
  if (!isMappingTypeMapping(parsed)) {
    throw new Error(`Invalid index mapping JSON (expected object): ${mappingPath}`);
  }
  mappingCache.set(mappingPath, parsed);
  return parsed;
};

export interface EnsureIndexOptions {
  esClient: Client;
  index: string;
  mappingPath: string;
  log: ToolingLog;
}

export const ensureIndex = async ({ esClient, index, mappingPath, log }: EnsureIndexOptions) => {
  const exists = await esClient.indices.exists({ index });
  if (exists) {
    // In serverless mode, indices can exist but still be temporarily unsearchable while shards allocate.
    await waitForIndexSearchable({ esClient, index, log });
    return;
  }

  log.info(`Creating index ${index}`);
  const mapping = readMappingJsonCached(mappingPath);
  await esClient.indices.create({
    index,
    settings: {
      'index.mapping.total_fields.limit': INDEX_FIELDS_LIMIT,
    },
    mappings: mapping,
  });

  await waitForIndexSearchable({ esClient, index, log });
};

export interface BulkIndexOptions {
  esClient: Client;
  index: string;
  docs: Array<Record<string, unknown>>;
  log: ToolingLog;
  /**
   * Approx max docs per bulk request.
   */
  batchSize?: number;
}

export const bulkIndex = async ({
  esClient,
  index,
  docs,
  log,
  batchSize = 1000,
}: BulkIndexOptions) => {
  if (docs.length === 0) return;

  for (let i = 0; i < docs.length; i += batchSize) {
    const slice = docs.slice(i, i + batchSize);
    const body = slice.flatMap((doc) => [{ index: { _index: index } }, doc]);
    const resp = await esClient.bulk({ refresh: false, body });
    assertNoBulkErrors(index, resp, log);
  }
};

export const dateSuffix = (ms: number): string => {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
};

export const dateSuffixesBetween = (startMs: number, endMs: number): string[] => {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error(`Invalid time range: startMs/endMs must be finite numbers`);
  }
  if (endMs < startMs) {
    throw new Error(`Invalid time range: endMs must be >= startMs`);
  }

  const suffixes: string[] = [];

  // Iterate UTC days inclusively, from start day to end day.
  const start = new Date(startMs);
  const end = new Date(endMs);
  let cur = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());

  while (cur <= endDay) {
    suffixes.push(dateSuffix(cur));
    cur += 24 * 60 * 60 * 1000;
  }

  return suffixes;
};

export const episodeIndexNames = ({
  episodeId,
  endMs,
  indexPrefix = 'logs-endpoint',
  dateSuffixOverride,
}: {
  episodeId: string; // ep1
  endMs: number;
  /**
   * Prefix for endpoint event/alert indices. Defaults to "logs-endpoint".
   * Use a different value if your cluster has templates/data streams that conflict with creating
   * concrete indices under "logs-endpoint.*".
   */
  indexPrefix?: string;
  /**
   * Optional override for the date suffix (YYYY.MM.DD). Useful for deleting indices across a range.
   */
  dateSuffixOverride?: string;
}) => {
  const suffix = dateSuffixOverride ?? dateSuffix(endMs);
  const epMatch = episodeId.match(/^ep(\d+)$/);
  if (epMatch) {
    const epNum = epMatch[1];
    return {
      // Keep a dot after `events` to avoid matching common data-stream templates that use `logs-endpoint.events-*`.
      endpointEvents: `${indexPrefix}.events.insights.ep${epNum}.${suffix}`,
      // Note: use a dot after `alerts` to avoid matching the Endpoint data stream template
      // which targets `logs-endpoint.alerts-*` (data streams only).
      endpointAlerts: `${indexPrefix}.alerts.insights.ep${epNum}.${suffix}`,
      insightsAlerts: `insights-alerts-ep${epNum}-${suffix}`,
    };
  }

  const safe = episodeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return {
    endpointEvents: `${indexPrefix}.events.${safe}.${suffix}`,
    endpointAlerts: `${indexPrefix}.alerts.${safe}.${suffix}`,
    insightsAlerts: `insights-alerts-${safe}-${suffix}`,
  };
};

export const scriptsDataDir = (...parts: string[]) => path.resolve(__dirname, '..', ...parts);
