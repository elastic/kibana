/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';

const INDEX_FIELDS_LIMIT = 6000;

const mappingCache = new Map<string, MappingTypeMapping>();

const isMappingTypeMapping = (value: unknown): value is MappingTypeMapping => {
  // MappingTypeMapping is a broad structural type; we validate minimally to avoid passing non-objects.
  return typeof value === 'object' && value !== null;
};

const readMappingJsonCached = (mappingPath: string): MappingTypeMapping => {
  const cached = mappingCache.get(mappingPath);
  if (cached) return cached;
  const parsed = JSON.parse(fs.readFileSync(mappingPath, 'utf8')) as unknown;
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
  if (exists) return;

  log.info(`Creating index ${index}`);
  const mapping = readMappingJsonCached(mappingPath);
  await esClient.indices.create({
    index,
    settings: {
      'index.mapping.total_fields.limit': INDEX_FIELDS_LIMIT,
    },
    mappings: mapping,
  });
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
    if (resp.errors) {
      const firstError = resp.items?.find((it) => {
        const action = it.index ?? it.create ?? it.update ?? it.delete;
        return action && 'error' in action;
      });
      log.error(
        `Bulk indexing into ${index} had errors. First error: ${JSON.stringify(firstError)}`
      );
      throw new Error(`Bulk indexing errors for ${index}`);
    }
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
