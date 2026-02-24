/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Recreate Alert Grouping demo alerts on a target Elastic cluster.
 *
 * Injects 48 alert documents from the E2E demo into the target cluster's
 * security alerts index. Supports timestamp shifting, host renaming, and
 * cleanup of previously injected alerts.
 *
 * No external dependencies — uses Node.js built-in fetch and fs.
 *
 * Usage:
 *   # Basic — inject alerts with timestamps shifted to now
 *   npx ts-node recreate_demo_alerts.ts --es-url https://my-cluster:9243 --api-key <key>
 *
 *   # Keep original timestamps
 *   npx ts-node recreate_demo_alerts.ts --es-url https://my-cluster:9243 --api-key <key> --no-time-shift
 *
 *   # Custom host name mapping
 *   npx ts-node recreate_demo_alerts.ts --es-url https://my-cluster:9243 --api-key <key> \
 *     --host-map 'patryk-defend-367602-1=test-host-1,patryk-defend-367602-2=test-host-2'
 *
 *   # Dry run
 *   npx ts-node recreate_demo_alerts.ts --es-url https://my-cluster:9243 --api-key <key> --dry-run
 *
 *   # Basic auth
 *   npx ts-node recreate_demo_alerts.ts --es-url https://localhost:9200 --user elastic --password changeme
 *
 *   # Cleanup previously injected alerts
 *   npx ts-node recreate_demo_alerts.ts --es-url https://my-cluster:9243 --api-key <key> --cleanup
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { resolve } from 'path';

// ── Constants ──

const SCRIPT_DIR = __dirname;
const DATASET_FILE = resolve(SCRIPT_DIR, 'alert_dataset.ndjson');
const DEFAULT_ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';
const INJECTED_TAG = 'demo-recreated';

// ── Types ──

interface AlertDocument {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface PreparedAlert {
  id: string;
  source: Record<string, unknown>;
}

interface ParsedArgs {
  esUrl: string;
  apiKey?: string;
  user?: string;
  password?: string;
  insecure: boolean;
  noTimeShift: boolean;
  hostMap: Record<string, string>;
  index: string;
  dataset: string;
  keepIds: boolean;
  dryRun: boolean;
  cleanup: boolean;
  summaryOnly: boolean;
  tag: string;
}

interface BulkResponseItem {
  index?: {
    _id: string;
    status: number;
    error?: { type: string; reason: string };
  };
}

// ── HTTP Client ──

class ESClient {
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

  head(path: string) {
    return this.request('HEAD', path);
  }
}

// ── Dataset Helpers ──

function loadDataset(path: string): AlertDocument[] {
  const content = readFileSync(path, 'utf-8');
  const docs: AlertDocument[] = [];

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

function parseTimestamp(ts: string): Date | null {
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function computeTimeShiftMs(docs: AlertDocument[]): number {
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

function shiftTimestamp(ts: unknown, deltaMs: number): unknown {
  if (typeof ts !== 'string' || !ts) return ts;
  const d = parseTimestamp(ts);
  if (!d) return ts;
  return new Date(d.getTime() + deltaMs).toISOString();
}

const TIMESTAMP_FIELDS = [
  '@timestamp',
  'kibana.alert.intended_timestamp',
  'kibana.alert.last_detected',
  'kibana.alert.original_time',
  'kibana.alert.start',
  'kibana.alert.rule.created_at',
  'kibana.alert.rule.updated_at',
  'kibana.alert.rule.execution.timestamp',
  'kibana.alert.workflow_status_updated_at',
  'kibana.alert.original_event.created',
  'kibana.alert.original_event.ingested',
];

function replaceAll(text: string, mapping: Record<string, string>): string {
  let result = text;
  for (const [oldVal, newVal] of Object.entries(mapping)) {
    result = result.split(oldVal).join(newVal);
  }
  return result;
}

function applyHostMap(
  source: Record<string, unknown>,
  hostMap: Record<string, string>
): Record<string, unknown> {
  if (Object.keys(hostMap).length === 0) return source;

  // Remap host.name
  const host = source.host as Record<string, unknown> | undefined;
  if (host && typeof host.name === 'string' && hostMap[host.name]) {
    host.name = hostMap[host.name];
  }

  // Remap in process command lines
  const proc = source.process as Record<string, unknown> | undefined;
  if (proc) {
    if (typeof proc.command_line === 'string') {
      proc.command_line = replaceAll(proc.command_line, hostMap);
    }
    if (Array.isArray(proc.args)) {
      proc.args = proc.args.map((a: unknown) =>
        typeof a === 'string' ? replaceAll(a, hostMap) : a
      );
    }
    const parent = proc.parent as Record<string, unknown> | undefined;
    if (parent && typeof parent.command_line === 'string') {
      parent.command_line = replaceAll(parent.command_line, hostMap);
    }
  }

  // Remap in reason text
  const reasonKey = 'kibana.alert.reason';
  if (typeof source[reasonKey] === 'string') {
    source[reasonKey] = replaceAll(source[reasonKey] as string, hostMap);
  }

  return source;
}

function prepareDocument(
  doc: AlertDocument,
  deltaMs: number | null,
  hostMap: Record<string, string>,
  newIds: boolean,
  injectedTag: string = INJECTED_TAG,
  extraTags: string[] = []
): PreparedAlert {
  const source: Record<string, unknown> = JSON.parse(JSON.stringify(doc._source));

  // Generate new unique IDs
  const id = newIds ? randomUUID().replace(/-/g, '') : doc._id;
  source['kibana.alert.uuid'] = id;

  // Shift timestamps
  if (deltaMs) {
    for (const field of TIMESTAMP_FIELDS) {
      if (source[field]) {
        source[field] = shiftTimestamp(source[field], deltaMs);
      }
    }

    // Nested event timestamps
    const event = source.event as Record<string, unknown> | undefined;
    if (event) {
      for (const ef of ['created', 'ingested']) {
        if (event[ef]) {
          event[ef] = shiftTimestamp(event[ef], deltaMs);
        }
      }
    }
  }

  // Apply host remapping
  applyHostMap(source, hostMap);

  // Reset workflow state — alerts should be "fresh" for triage
  source['kibana.alert.workflow_status'] = 'open';
  source['kibana.alert.workflow_tags'] = [];
  source['kibana.alert.case_ids'] = [];
  source['kibana.alert.workflow_assignee_ids'] = [];
  source['kibana.alert.status'] = 'active';

  // Add marker tag for cleanup + extra tags
  let tags = source.tags as string[] | undefined;
  if (!Array.isArray(tags)) {
    tags = [];
  }
  if (!tags.includes(injectedTag)) {
    tags.push(injectedTag);
  }
  for (const extra of extraTags) {
    if (!tags.includes(extra)) {
      tags.push(extra);
    }
  }
  source.tags = tags;

  // New execution UUID
  source['kibana.alert.rule.execution.uuid'] = randomUUID();

  return { id, source };
}

// ── Actions ──

async function checkCluster(client: ESClient): Promise<boolean> {
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

async function checkAlertIndex(client: ESClient): Promise<boolean> {
  const { status } = await client.head('/.alerts-security.alerts-*');
  return status === 200;
}

async function injectAlerts(
  client: ESClient,
  docs: PreparedAlert[],
  index: string,
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log(`\n  [DRY RUN] Would inject ${docs.length} alerts into ${index}`);
    for (const { id, source } of docs.slice(0, 5)) {
      const host =
        typeof source.host === 'object' && source.host !== null
          ? (source.host as Record<string, unknown>).name ?? '?'
          : '?';
      const rule = (source['kibana.alert.rule.name'] as string) ?? '?';
      const ts = (source['@timestamp'] as string) ?? '?';
      console.log(`    ${String(id).slice(0, 12)}... | ${rule.padEnd(55)} | ${host} | ${ts}`);
    }
    if (docs.length > 5) {
      console.log(`    ... and ${docs.length - 5} more`);
    }
    return 0;
  }

  // Build NDJSON bulk body
  const lines: string[] = [];
  for (const { id, source } of docs) {
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
    return 0;
  }

  const result = body as { items?: BulkResponseItem[] };
  const items = result.items ?? [];
  let errors = 0;

  for (const item of items) {
    if (item.index?.error) {
      errors++;
      if (errors <= 3) {
        console.error(
          `  ERROR: ${item.index.error.type}: ${item.index.error.reason.slice(0, 200)}`
        );
      }
    }
  }

  if (errors > 3) {
    console.error(`  ... and ${errors - 3} more errors`);
  }

  return items.length - errors;
}

async function cleanupAlerts(
  client: ESClient,
  dryRun: boolean,
  tag: string = INJECTED_TAG
): Promise<number> {
  const { status: countStatus, body: countBody } = await client.post(
    '/.alerts-security.alerts-*/_count',
    { query: { term: { tags: tag } } }
  );

  if (countStatus !== 200) {
    console.error(
      `  ERROR: Count failed (${countStatus}): ${JSON.stringify(countBody).slice(0, 200)}`
    );
    return 0;
  }

  const count = ((countBody as Record<string, unknown>).count as number) ?? 0;
  console.log(`  Found ${count} previously injected alerts (tag: '${tag}')`);

  if (count === 0) return 0;

  if (dryRun) {
    console.log(`  [DRY RUN] Would delete ${count} alerts`);
    return 0;
  }

  const { status: delStatus, body: delBody } = await client.post(
    '/.alerts-security.alerts-*/_delete_by_query?refresh=true',
    { query: { term: { tags: tag } } }
  );

  if (delStatus !== 200) {
    console.error(
      `  ERROR: Delete failed (${delStatus}): ${JSON.stringify(delBody).slice(0, 200)}`
    );
    return 0;
  }

  return ((delBody as Record<string, unknown>).deleted as number) ?? 0;
}

async function verifyInjection(client: ESClient): Promise<void> {
  const { status: countStatus, body: countBody } = await client.post(
    '/.alerts-security.alerts-*/_count',
    { query: { term: { tags: INJECTED_TAG } } }
  );

  if (countStatus === 200 && typeof countBody === 'object' && countBody !== null) {
    console.log(`  Injected alerts in index: ${(countBody as Record<string, unknown>).count}`);
  }

  const { status, body } = await client.post('/.alerts-security.alerts-*/_search', {
    size: 0,
    query: { term: { tags: INJECTED_TAG } },
    aggs: {
      min_ts: { min: { field: '@timestamp' } },
      max_ts: { max: { field: '@timestamp' } },
      by_host: { terms: { field: 'host.name', size: 20 } },
      by_rule: { terms: { field: 'kibana.alert.rule.name', size: 20 } },
    },
  });

  if (status === 200 && typeof body === 'object' && body !== null) {
    const aggs = (body as Record<string, unknown>).aggregations as
      | Record<string, unknown>
      | undefined;
    if (aggs) {
      const minTs = (aggs.min_ts as Record<string, unknown>)?.value_as_string ?? '?';
      const maxTs = (aggs.max_ts as Record<string, unknown>)?.value_as_string ?? '?';
      console.log(`  Time range: ${minTs} → ${maxTs}`);

      console.log('  By host:');
      const hostBuckets = ((aggs.by_host as Record<string, unknown>)?.buckets ?? []) as Array<{
        key: string;
        doc_count: number;
      }>;
      for (const bucket of hostBuckets) {
        console.log(`    ${bucket.key}: ${bucket.doc_count}`);
      }

      console.log('  By rule:');
      const ruleBuckets = ((aggs.by_rule as Record<string, unknown>)?.buckets ?? []) as Array<{
        key: string;
        doc_count: number;
      }>;
      for (const bucket of ruleBuckets) {
        console.log(`    ${bucket.key}: ${bucket.doc_count}`);
      }
    }
  }
}

function printSummary(docs: PreparedAlert[]): void {
  const byHost: Record<string, number> = {};
  const byRule: Record<string, number> = {};
  const timestamps: string[] = [];

  for (const { source } of docs) {
    const host =
      typeof source.host === 'object' && source.host !== null
        ? ((source.host as Record<string, unknown>).name as string) ?? 'unknown'
        : 'unknown';
    const rule = (source['kibana.alert.rule.name'] as string) ?? 'unknown';
    const ts = source['@timestamp'] as string;

    byHost[host] = (byHost[host] ?? 0) + 1;
    byRule[rule] = (byRule[rule] ?? 0) + 1;
    if (ts) timestamps.push(ts);
  }

  console.log(`\n── Alert Dataset Summary ──`);
  console.log(`  Total alerts: ${docs.length}`);
  if (timestamps.length > 0) {
    timestamps.sort();
    console.log(`  Time range:   ${timestamps[0]} → ${timestamps[timestamps.length - 1]}`);
  }

  console.log(`\n  By host:`);
  for (const [host, count] of Object.entries(byHost).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${host}: ${count}`);
  }

  console.log(`\n  By rule:`);
  for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${rule}: ${count}`);
  }
}

// ── Argument Parsing ──

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    esUrl: '',
    insecure: false,
    noTimeShift: false,
    hostMap: {},
    index: DEFAULT_ALERT_INDEX,
    dataset: DATASET_FILE,
    keepIds: false,
    dryRun: false,
    cleanup: false,
    summaryOnly: false,
    tag: INJECTED_TAG,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];

    switch (arg) {
      case '--es-url':
        args.esUrl = next();
        break;
      case '--api-key':
        args.apiKey = next();
        break;
      case '--user':
      case '-u':
        args.user = next();
        break;
      case '--password':
      case '-p':
        args.password = next();
        break;
      case '--insecure':
      case '-k':
        args.insecure = true;
        break;
      case '--no-time-shift':
        args.noTimeShift = true;
        break;
      case '--host-map':
        for (const mapping of next().split(',')) {
          const [oldName, newName] = mapping.split('=');
          if (oldName && newName) {
            args.hostMap[oldName.trim()] = newName.trim();
          }
        }
        break;
      case '--index':
        args.index = next();
        break;
      case '--dataset':
        args.dataset = next();
        break;
      case '--keep-ids':
        args.keepIds = true;
        break;
      case '--tag':
        args.tag = next();
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--cleanup':
        args.cleanup = true;
        break;
      case '--summary-only':
        args.summaryOnly = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Usage: npx ts-node recreate_demo_alerts.ts [options]

Connection:
  --es-url <url>        Elasticsearch URL (required)
  --api-key <key>       API key (base64 encoded)
  --user, -u <user>     Username for basic auth
  --password, -p <pwd>  Password for basic auth
  --insecure, -k        Skip TLS verification

Options:
  --no-time-shift       Keep original timestamps (default: shift to now)
  --host-map <map>      Comma-separated host mappings: old1=new1,old2=new2
  --index <index>       Target index (default: ${DEFAULT_ALERT_INDEX})
  --dataset <path>      Path to NDJSON dataset file
  --keep-ids            Keep original alert IDs (default: generate new)

Actions:
  --dry-run             Show what would be done without making changes
  --cleanup             Remove previously injected demo alerts
  --summary-only        Print dataset summary and exit
  --help, -h            Show this help message

Examples:
  # Inject with time shift to now
  npx ts-node recreate_demo_alerts.ts --es-url https://cluster:9243 --api-key <key>

  # Remap hosts and dry run
  npx ts-node recreate_demo_alerts.ts --es-url https://cluster:9243 --api-key <key> \\
    --host-map 'patryk-defend-367602-1=host-a,patryk-defend-367602-2=host-b' --dry-run

  # Cleanup
  npx ts-node recreate_demo_alerts.ts --es-url https://cluster:9243 --api-key <key> --cleanup
`);
}

// ── Main ──

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  // Handle TLS for self-signed certs
  if (args.insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // ── Load dataset ──
  try {
    readFileSync(args.dataset);
  } catch {
    console.error(`ERROR: Dataset not found: ${args.dataset}`);
    console.error(`  Expected at: ${DATASET_FILE}`);
    process.exit(1);
  }

  const rawDocs = loadDataset(args.dataset);
  console.log(`Loaded ${rawDocs.length} alerts from ${args.dataset.split('/').pop()}`);

  // ── Host map ──
  if (Object.keys(args.hostMap).length > 0) {
    console.log(`Host remapping: ${JSON.stringify(args.hostMap)}`);
  }

  // ── Time shift ──
  let deltaMs: number | null = null;
  if (!args.noTimeShift) {
    deltaMs = computeTimeShiftMs(rawDocs);
    const hours = deltaMs / (1000 * 60 * 60);
    console.log(`Time shift: +${hours.toFixed(1)} hours (moving alerts to current time)`);
  }

  // ── Prepare documents ──
  const prepared = rawDocs.map((doc) =>
    prepareDocument(doc, deltaMs, args.hostMap, !args.keepIds, args.tag)
  );

  // ── Summary only ──
  if (args.summaryOnly) {
    printSummary(prepared);
    process.exit(0);
  }

  printSummary(prepared);

  // ── Validate connection args ──
  if (!args.esUrl) {
    console.error('\nERROR: --es-url is required');
    process.exit(1);
  }
  if (!args.apiKey && !(args.user && args.password)) {
    console.error('\nERROR: Provide --api-key or --user + --password');
    process.exit(1);
  }

  const client = new ESClient({
    baseUrl: args.esUrl,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });

  // ── Connect ──
  console.log(`\n── Connecting to ${args.esUrl} ──`);
  const healthy = await checkCluster(client);
  if (!healthy && !args.dryRun) {
    process.exit(1);
  }
  if (!healthy) {
    console.log('  (continuing dry run despite connection failure)');
  }

  // ── Cleanup ──
  if (args.cleanup) {
    console.log(`\n── Cleaning up ──`);
    const deleted = await cleanupAlerts(client, args.dryRun, args.tag);
    if (!args.dryRun) {
      console.log(`  Deleted ${deleted} alerts`);
    }
    process.exit(0);
  }

  // ── Check index ──
  const indexExists = await checkAlertIndex(client);
  if (!indexExists) {
    console.warn(`\n  WARNING: .alerts-security.alerts-* not found on the target cluster.`);
    console.warn(`  Ensure at least one detection rule has executed to create the alert index.`);
    if (!args.dryRun) {
      console.warn('  Proceeding anyway...');
    }
  }

  // ── Inject ──
  console.log(`\n── Injecting ${prepared.length} alerts ──`);
  const success = await injectAlerts(client, prepared, args.index, args.dryRun);

  if (!args.dryRun) {
    console.log(`\n  Successfully injected: ${success}/${prepared.length} alerts`);
    if (success < prepared.length) {
      console.log(`  Failed: ${prepared.length - success}`);
    }
  }

  // ── Verify ──
  if (!args.dryRun && success > 0) {
    console.log(`\n── Verification ──`);
    await verifyInjection(client);
  }

  // ── Done ──
  console.log(`\n── Done ──`);
  if (!args.dryRun && success > 0) {
    console.log(`\nAlerts are ready for triage. Run either approach:`);
    console.log(`  Alert Grouping:  POST /api/security/alert_grouping/workflow/{id}/_run`);
    console.log(`  Triage Prompt:   python fetch_next_alert.py`);
    console.log(`\nTo clean up later:`);
    console.log(
      `  npx ts-node recreate_demo_alerts.ts --es-url ${args.esUrl} --api-key <key> --cleanup`
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
