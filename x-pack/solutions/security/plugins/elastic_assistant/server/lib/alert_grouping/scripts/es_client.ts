/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared Elasticsearch HTTP client and argument parsing utilities for comparison scripts.
 * Zero external dependencies — uses Node.js built-in fetch.
 */

import { readFileSync } from 'fs';

// ── Types ──

export interface NdjsonDocument {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

export interface BulkResponseItem {
  index?: {
    _id: string;
    status: number;
    error?: { type: string; reason: string };
  };
}

export interface ConnectionArgs {
  esUrl: string;
  kibanaUrl?: string;
  apiKey?: string;
  user?: string;
  password?: string;
  insecure?: boolean;
}

// ── HTTP Client ──

export class ESClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor({
    baseUrl,
    apiKey,
    user,
    password,
  }: {
    baseUrl: string;
    apiKey?: string;
    user?: string;
    password?: string;
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };

    if (apiKey) {
      this.headers.Authorization = `ApiKey ${apiKey}`;
    } else if (user && password) {
      const creds = Buffer.from(`${user}:${password}`).toString('base64');
      this.headers.Authorization = `Basic ${creds}`;
    }
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    contentType?: string
  ): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...this.headers };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const resp = await fetch(url, init);
      const text = await resp.text();
      try {
        return { status: resp.status, body: JSON.parse(text) };
      } catch {
        return { status: resp.status, body: text };
      }
    } catch (err) {
      console.error(`ERROR: Connection failed: ${(err as Error).message}`);
      return { status: 0, body: (err as Error).message };
    }
  }

  get(path: string) {
    return this.request('GET', path);
  }

  post(path: string, body?: unknown, contentType?: string) {
    return this.request('POST', path, body, contentType);
  }

  patch(path: string, body?: unknown) {
    return this.request('PATCH', path, body);
  }

  head(path: string) {
    return this.request('HEAD', path);
  }

  getBaseUrl() {
    return this.baseUrl;
  }
}

/**
 * Kibana HTTP client — adds kbn-xsrf header and uses Kibana base URL.
 * Supports Kibana Spaces via the `spaceId` option (prepends `/s/{spaceId}` to all paths).
 */
export class KibanaClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly spacePrefix: string;

  constructor({
    baseUrl,
    apiKey,
    user,
    password,
    spaceId,
  }: {
    baseUrl: string;
    apiKey?: string;
    user?: string;
    password?: string;
    spaceId?: string;
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.spacePrefix = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
    this.headers = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
    };

    if (apiKey) {
      this.headers.Authorization = `ApiKey ${apiKey}`;
    } else if (user && password) {
      const creds = Buffer.from(`${user}:${password}`).toString('base64');
      this.headers.Authorization = `Basic ${creds}`;
    }
  }

  async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${this.spacePrefix}${path}`;
    const init: RequestInit = { method, headers: { ...this.headers } };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    try {
      const resp = await fetch(url, init);
      const text = await resp.text();
      try {
        return { status: resp.status, body: JSON.parse(text) };
      } catch {
        return { status: resp.status, body: text };
      }
    } catch (err) {
      console.error(`ERROR: Kibana connection failed: ${(err as Error).message}`);
      return { status: 0, body: (err as Error).message };
    }
  }

  get(path: string) {
    return this.request('GET', path);
  }

  post(path: string, body?: unknown) {
    return this.request('POST', path, body);
  }

  patch(path: string, body?: unknown) {
    return this.request('PATCH', path, body);
  }

  delete(path: string) {
    return this.request('DELETE', path);
  }

  getSpacePrefix(): string {
    return this.spacePrefix;
  }
}

// ── Dataset Helpers ──

export function loadNdjson(path: string): NdjsonDocument[] {
  const content = readFileSync(path, 'utf-8');
  const docs: NdjsonDocument[] = [];

  for (const [i, line] of content.split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      docs.push(JSON.parse(trimmed));
    } catch (e) {
      console.warn(`WARNING: Skipping malformed line ${i + 1}: ${(e as Error).message}`);
    }
  }

  return docs;
}

export function parseTimestamp(ts: string): Date | null {
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function computeTimeShiftMs(docs: NdjsonDocument[]): number {
  let latest = 0;

  for (const doc of docs) {
    const ts = doc._source['@timestamp'];
    if (typeof ts === 'string') {
      const d = parseTimestamp(ts);
      if (d && d.getTime() > latest) {
        latest = d.getTime();
      }
    }
  }

  return latest > 0 ? Date.now() - latest : 0;
}

export function shiftTimestamp(ts: unknown, deltaMs: number): unknown {
  if (typeof ts !== 'string' || !ts) return ts;
  const d = parseTimestamp(ts);
  if (!d) return ts;
  return new Date(d.getTime() + deltaMs).toISOString();
}

// ── Argument Parsing ──

export function parseConnectionArgs(argv: string[]): ConnectionArgs & {
  dryRun: boolean;
  insecure: boolean;
  extra: Record<string, string>;
  flags: Set<string>;
} {
  const result: ConnectionArgs & {
    dryRun: boolean;
    insecure: boolean;
    extra: Record<string, string>;
    flags: Set<string>;
  } = {
    esUrl: '',
    dryRun: false,
    insecure: false,
    extra: {},
    flags: new Set(),
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];

    switch (arg) {
      case '--es-url':
        result.esUrl = next();
        break;
      case '--kibana-url':
        result.kibanaUrl = next();
        break;
      case '--api-key':
        result.apiKey = next();
        break;
      case '--user':
      case '-u':
        result.user = next();
        break;
      case '--password':
      case '-p':
        result.password = next();
        break;
      case '--insecure':
      case '-k':
        result.insecure = true;
        break;
      case '--dry-run':
        result.dryRun = true;
        break;
      default:
        if (
          arg.startsWith('--no-') ||
          (arg.startsWith('--') && !argv[i + 1]?.startsWith('--') === false)
        ) {
          if (arg.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
            result.extra[arg.replace(/^--/, '')] = next();
          } else {
            result.flags.add(arg.replace(/^--/, ''));
          }
        } else if (arg.startsWith('--') && i + 1 < argv.length) {
          result.extra[arg.replace(/^--/, '')] = next();
        } else {
          result.flags.add(arg.replace(/^--/, ''));
        }
    }
  }

  if (result.insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  return result;
}

export async function checkCluster(client: ESClient): Promise<boolean> {
  const { status, body } = await client.get('/_cluster/health');
  if (status === 200 && typeof body === 'object' && body !== null) {
    const health = body as Record<string, unknown>;
    console.log(`  Cluster: ${health.cluster_name ?? 'unknown'}`);
    console.log(`  Status:  ${health.status ?? 'unknown'}`);
    console.log(`  Nodes:   ${health.number_of_nodes ?? '?'}`);
    return true;
  }
  console.error(`  ERROR: Cluster returned ${status}: ${JSON.stringify(body).slice(0, 200)}`);
  return false;
}

/**
 * Bulk-inject NDJSON documents into Elasticsearch.
 * Returns count of successfully indexed documents.
 */
export async function bulkInject(
  client: ESClient,
  docs: Array<{ id: string; index: string; source: Record<string, unknown> }>,
  dryRun: boolean,
  label: string = 'documents'
): Promise<number> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would inject ${docs.length} ${label}`);
    return 0;
  }

  // Split into batches of 500 to avoid request size limits
  const BATCH_SIZE = 500;
  let totalSuccess = 0;

  for (let offset = 0; offset < docs.length; offset += BATCH_SIZE) {
    const batch = docs.slice(offset, offset + BATCH_SIZE);
    const lines: string[] = [];

    for (const { id, index, source } of batch) {
      lines.push(JSON.stringify({ index: { _index: index, _id: id } }));
      lines.push(JSON.stringify(source));
    }

    const bulkBody = `${lines.join('\n')}\n`;
    const { status, body } = await client.post(
      '/_bulk?refresh=true',
      bulkBody,
      'application/x-ndjson'
    );

    if ((status !== 200 && status !== 201) || typeof body !== 'object' || body === null) {
      console.error(
        `  ERROR: Bulk request failed (${status}): ${JSON.stringify(body).slice(0, 500)}`
      );
      continue;
    }

    const result = body as { items?: BulkResponseItem[] };
    const items = result.items ?? [];
    let errors = 0;

    for (const item of items) {
      if (item.index?.error) {
        errors++;
        if (errors <= 2) {
          console.error(
            `  ERROR: ${item.index.error.type}: ${item.index.error.reason.slice(0, 200)}`
          );
        }
      }
    }

    totalSuccess += items.length - errors;

    if (docs.length > BATCH_SIZE) {
      console.log(
        `  Batch ${Math.floor(offset / BATCH_SIZE) + 1}: ${items.length - errors}/${
          batch.length
        } ok`
      );
    }
  }

  return totalSuccess;
}
