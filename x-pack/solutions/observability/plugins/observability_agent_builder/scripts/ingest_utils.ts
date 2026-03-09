/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

/**
 * Shared utilities for the dataset ingestion scripts.
 *
 * Provides CLI parsing, CSV handling (via papaparse), timestamp remapping,
 * Elasticsearch bulk indexing, index-template management, and log-level
 * inference — all the pieces that were previously duplicated across
 * ingest_loghub.ts, ingest_openrca.ts and ingest_rcaeval.ts.
 */

import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import extractZipLib from 'extract-zip';
import minimist from 'minimist';
import moment from 'moment';
import Papa from 'papaparse';
import pLimit from 'p-limit';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

export interface BaseArgs {
  esUrl: string;
  window: string;
  [key: string]: string | undefined;
}

export function parseArgs<T extends BaseArgs>(
  extraKeys: string[] = [],
  defaults: Partial<Record<string, string>> = {}
): T {
  const argv = minimist(process.argv.slice(2), {
    string: ['es-url', 'window', ...extraKeys],
    default: { 'es-url': 'http://elastic:changeme@localhost:9200', window: '1h', ...defaults },
  });
  const result: Record<string, string | undefined> = {
    esUrl: argv['es-url'],
    window: argv.window,
  };
  for (const key of extraKeys) {
    result[key] = argv[key] ?? defaults[key];
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Duration parsing
// ---------------------------------------------------------------------------

const DURATION_UNITS: Record<string, moment.unitOfTime.DurationConstructor> = {
  ms: 'milliseconds',
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: "${duration}"`);
  return moment.duration(parseInt(match[1], 10), DURATION_UNITS[match[2]]).asMilliseconds();
}

// ---------------------------------------------------------------------------
// CSV parsing (via papaparse)
// ---------------------------------------------------------------------------

export function parseCsv(text: string): Record<string, string>[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Download and extract
// ---------------------------------------------------------------------------

export async function downloadText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body! as any), createWriteStream(destPath));
}

export async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await extractZipLib(zipPath, { dir: destDir });
}

// ---------------------------------------------------------------------------
// Timestamp parsing
// ---------------------------------------------------------------------------

export function parseUtcTimestamp(input: string, format: string): number | null {
  const m = moment.utc(input, format, true);
  return m.isValid() ? m.valueOf() : null;
}

// ---------------------------------------------------------------------------
// Log level inference
// ---------------------------------------------------------------------------

const SEVERITY_RE = /severity:\s*(info|warn(?:ing)?|error|debug|fatal|critical)/i;
const ERROR_RE = /error|fail|exception|timeout|traceback|panic|fatal|severe|crash|overflow/i;
const WARN_RE = /\bwarn(?:ing)?\b/i;
const DEBUG_RE = /\bdebug\b/i;

export function inferLogLevel(message: string): string {
  const severityMatch = message.match(SEVERITY_RE);
  if (severityMatch) return severityMatch[1].toLowerCase();

  if (ERROR_RE.test(message)) return 'error';
  if (WARN_RE.test(message)) return 'warn';
  if (DEBUG_RE.test(message)) return 'debug';
  return 'info';
}

// ---------------------------------------------------------------------------
// Timestamp remapping
// ---------------------------------------------------------------------------

export function remapTimestamps(msTimestamps: number[], windowMs: number): number[] {
  if (msTimestamps.length === 0) return [];

  let minTs = Infinity;
  let maxTs = -Infinity;
  for (const ts of msTimestamps) {
    if (ts < minTs) minTs = ts;
    if (ts > maxTs) maxTs = ts;
  }
  const originalRange = maxTs - minTs || 1;

  const now = Date.now();
  const windowStart = now - windowMs;

  return msTimestamps.map((ts) =>
    Math.round(windowStart + ((ts - minTs) / originalRange) * windowMs)
  );
}

// ---------------------------------------------------------------------------
// Elasticsearch helpers
// ---------------------------------------------------------------------------

export async function createEsClient(esUrl: string): Promise<Client> {
  const client = new Client({ node: esUrl });

  try {
    const info = await client.info();
    console.log(`Connected to Elasticsearch ${info.version.number}`);
  } catch (err: any) {
    console.error(`Failed to connect to Elasticsearch: ${err.message}`);
    process.exit(1);
  }

  return client;
}

export async function ensureIndexTemplate(
  client: Client,
  templateName: string,
  indexPattern: string,
  mappingProperties: Record<string, MappingProperty>
): Promise<void> {
  const body = {
    name: templateName,
    index_patterns: [indexPattern],
    data_stream: {},
    priority: 500,
    template: {
      settings: { number_of_shards: 1, number_of_replicas: 0, refresh_interval: '-1' },
      mappings: { properties: mappingProperties },
    },
  };

  try {
    await client.indices.putIndexTemplate(body);
    console.log(`Created index template: ${templateName}`);
  } catch (err: any) {
    if (err?.meta?.statusCode === 200 || err?.message?.includes('already exists')) {
      console.log(`Index template ${templateName} already exists`);
      return;
    }

    const conflictMatch = err?.message?.match(/existing templates \[([^\]]+)\] with patterns/);
    if (err?.meta?.statusCode === 400 && conflictMatch) {
      const staleTemplate = conflictMatch[1].split(' => ')[0].trim();
      console.log(`Deleting conflicting index template: ${staleTemplate}`);
      await client.indices.deleteIndexTemplate({ name: staleTemplate });
      await client.indices.putIndexTemplate(body);
      console.log(`Created index template: ${templateName}`);
      return;
    }

    throw err;
  }
}

export async function deleteDataStream(client: Client, name: string): Promise<void> {
  try {
    await client.indices.deleteDataStream({ name });
    console.log(`Deleted existing data stream: ${name}`);
  } catch {
    // Data stream doesn't exist yet
  }
}

export async function restoreAndRefresh(client: Client, indexPattern: string): Promise<void> {
  console.log('Restoring refresh interval and refreshing indices...');
  await client.indices.putSettings({
    index: indexPattern,
    settings: { index: { refresh_interval: '1s' } },
  });
  await client.indices.refresh({ index: indexPattern });
}

// ---------------------------------------------------------------------------
// Bulk indexing
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_SIZE = 5000;
const DEFAULT_CONCURRENCY = 10;

export interface BulkIndexOptions {
  batchSize?: number;
  concurrency?: number;
  label?: string;
}

export async function bulkIndex(
  client: Client,
  docs: Record<string, unknown>[],
  indexName: string,
  options: BulkIndexOptions = {}
): Promise<number> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const label = options.label ?? indexName;

  const limit = pLimit(concurrency);
  const tasks: Promise<void>[] = [];
  let indexed = 0;
  let errors = 0;

  for (let offset = 0; offset < docs.length; offset += batchSize) {
    const batch = docs.slice(offset, offset + batchSize);
    const operations = batch.flatMap((doc) => [{ create: { _index: indexName } }, doc]);

    tasks.push(
      limit(async () => {
        const response = await client.bulk({ operations, refresh: false });
        if (response.errors) {
          const errorItems = response.items.filter((item) => item.create?.error);
          errors += errorItems.length;
          if (errors <= 3) {
            const firstError = errorItems[0]?.create?.error;
            console.error(`  Bulk error: ${firstError?.type}: ${firstError?.reason}`);
          }
        }
        const batchErrors = response.errors
          ? response.items.filter((item) => item.create?.error).length
          : 0;
        indexed += batch.length - batchErrors;
        process.stdout.write(`  [${label}] Indexed ${indexed}/${docs.length} documents\r`);
      })
    );
  }

  await Promise.all(tasks);
  console.log();

  if (errors > 0) {
    console.error(`  ${errors} indexing errors`);
  }
  return indexed;
}

// ---------------------------------------------------------------------------
// OTLP trace export
// ---------------------------------------------------------------------------

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: Array<{
    key: string;
    value: { stringValue?: string; intValue?: number; doubleValue?: number };
  }>;
  status?: { code: number; message?: string };
}

export interface OtlpResourceSpans {
  serviceName: string;
  spans: OtlpSpan[];
}

const OTLP_BATCH_SIZE = 5000;

export async function checkOtlpEndpoint(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/v1/traces`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    // The OTLP endpoint returns 405 for GET, which still means it's reachable
    return res.status === 405 || res.ok;
  } catch {
    return false;
  }
}

export type DatasetId = 'openrca' | 'rcaeval-re3';

const OTLP_CONCURRENCY = 3;

export async function exportTracesViaOtlp(
  resourceSpansList: OtlpResourceSpans[],
  otlpEndpoint: string,
  options?: { label?: string; datasetId?: DatasetId }
): Promise<number> {
  const tag = options?.label ? `[${options.label}] ` : '';
  let totalExported = 0;
  const limit = pLimit(OTLP_CONCURRENCY);

  for (const { serviceName, spans } of resourceSpansList) {
    const tasks: Promise<void>[] = [];

    for (let offset = 0; offset < spans.length; offset += OTLP_BATCH_SIZE) {
      const batch = spans.slice(offset, offset + OTLP_BATCH_SIZE);

      const resourceAttributes: Array<{
        key: string;
        value: { stringValue?: string };
      }> = [{ key: 'service.name', value: { stringValue: serviceName } }];

      if (options?.datasetId) {
        resourceAttributes.push({
          key: 'ingest.dataset',
          value: { stringValue: options.datasetId },
        });
      }

      const payload = {
        resourceSpans: [
          {
            resource: { attributes: resourceAttributes },
            scopeSpans: [
              {
                scope: { name: 'dataset-ingest', version: '1.0.0' },
                spans: batch,
              },
            ],
          },
        ],
      };

      tasks.push(
        limit(async () => {
          const res = await fetch(`${otlpEndpoint}/v1/traces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`OTLP export failed (${res.status}): ${body}`);
          }

          totalExported += batch.length;
          process.stdout.write(`  ${tag}Exported ${totalExported} spans for ${serviceName}\r`);
        })
      );
    }

    await Promise.all(tasks);
  }

  if (totalExported > 0) console.log();
  return totalExported;
}

export async function deleteApmDataStreams(client: Client): Promise<void> {
  for (const pattern of ['traces-apm*', 'metrics-apm*', 'traces-*.otel-*', 'metrics-*.otel-*']) {
    await deleteDataStream(client, pattern);
  }
}

export function generateHexId(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const HEX_RE = /^[0-9a-fA-F]+$/;
const hexIdCache = new Map<string, string>();

export function toHexId(input: string, length: number): string {
  if (HEX_RE.test(input)) {
    return input.padStart(length, '0').slice(-length);
  }
  const cached = hexIdCache.get(input);
  if (cached) return cached;

  // Simple numeric hash to convert arbitrary strings to stable hex IDs
  let h1 = 2166136261;
  let h2 = 16777619;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 + c, 16777619) % 4294967296;
    h2 = Math.imul(h2 + c, 2166136261) % 4294967296;
  }
  const hex =
    Math.abs(h1).toString(16).padStart(8, '0') +
    Math.abs(h2).toString(16).padStart(8, '0') +
    Math.abs(h1 + h2)
      .toString(16)
      .padStart(8, '0') +
    Math.abs(h1 * 31 + h2)
      .toString(16)
      .padStart(8, '0');
  const result = hex.slice(0, length);
  hexIdCache.set(input, result);
  return result;
}

// ---------------------------------------------------------------------------
// Infrastructure metric mappings (ECS)
// ---------------------------------------------------------------------------

export const INFRA_METRIC_MAPPINGS = {
  '@timestamp': { type: 'date' as const },
  host: {
    properties: {
      name: { type: 'keyword' as const },
    },
  },
  service: {
    properties: {
      name: { type: 'keyword' as const },
    },
  },
  system: {
    properties: {
      cpu: {
        properties: {
          total: {
            properties: {
              norm: {
                properties: {
                  pct: { type: 'float' as const },
                },
              },
            },
          },
        },
      },
      memory: {
        properties: {
          actual: {
            properties: {
              used: {
                properties: {
                  pct: { type: 'float' as const },
                },
              },
            },
          },
        },
      },
      network: {
        properties: {
          in: {
            properties: {
              bytes: { type: 'long' as const },
            },
          },
          out: {
            properties: {
              bytes: { type: 'long' as const },
            },
          },
        },
      },
      diskio: {
        properties: {
          read: {
            properties: {
              bytes: { type: 'long' as const },
            },
          },
          write: {
            properties: {
              bytes: { type: 'long' as const },
            },
          },
        },
      },
    },
  },
  labels: {
    properties: {
      dataset: { type: 'keyword' as const },
      system: { type: 'keyword' as const },
      metric_name: { type: 'keyword' as const },
    },
  },
  event: {
    properties: {
      dataset: { type: 'keyword' as const },
      module: { type: 'keyword' as const },
    },
  },
};

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

export function maskPassword(url: string): string {
  const parsed = new URL(url);
  if (parsed.password) {
    parsed.password = '****';
  }
  return parsed.toString().replace(/\/$/, '');
}

export function printVerifyCommands(esUrl: string, indexPattern: string): void {
  const parsed = new URL(esUrl);
  const baseUrl = `${parsed.protocol}//${parsed.host}`;
  console.log('\nVerify:');
  console.log(
    `  curl -s -u ${parsed.username}:${parsed.password} "${baseUrl}/_cat/indices/${indexPattern}?v&h=index,docs.count,store.size"`
  );
}
