/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Multiply the 48-alert demo dataset to 500+ alerts for scale testing.
 *
 * Creates N copies of the base dataset with:
 * - Unique host names per copy (host-1-copy-1, host-1-copy-2, etc.)
 * - Staggered timestamps (each copy offset by a configurable window)
 * - Unique alert IDs
 *
 * Usage:
 *   # Generate 500+ alerts (10 copies × 48 = 480) and inject
 *   npx tsx scale_dataset_generator.ts --es-url http://localhost:9200 -u elastic -p changeme --copies 10
 *
 *   # Generate to stdout (NDJSON) for inspection
 *   npx tsx scale_dataset_generator.ts --output /tmp/scaled_alerts.ndjson --copies 12
 *
 *   # Cleanup
 *   npx tsx scale_dataset_generator.ts --es-url http://localhost:9200 -u elastic -p changeme --cleanup
 */

import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import {
  ESClient,
  loadNdjson,
  computeTimeShiftMs,
  shiftTimestamp,
  parseConnectionArgs,
  checkCluster,
  bulkInject,
  type NdjsonDocument,
} from './es_client';

const SCRIPT_DIR = __dirname;
const ALERT_DATASET = resolve(SCRIPT_DIR, 'alert_dataset.ndjson');
const EVENT_DATASET = resolve(SCRIPT_DIR, 'endpoint_events_dataset.ndjson');
const DEFAULT_ALERT_INDEX = '.internal.alerts-security.alerts-default-000001';
const INJECTED_TAG = 'demo-scaled';

const ALERT_TIMESTAMP_FIELDS = [
  '@timestamp',
  'kibana.alert.intended_timestamp',
  'kibana.alert.last_detected',
  'kibana.alert.original_time',
  'kibana.alert.start',
  'kibana.alert.rule.execution.timestamp',
  'kibana.alert.workflow_status_updated_at',
  'kibana.alert.original_event.created',
  'kibana.alert.original_event.ingested',
];

const EVENT_TIMESTAMP_FIELDS = ['@timestamp', 'event.created', 'event.ingested'];

const ORIGINAL_HOSTS = [
  'patryk-defend-367602-1',
  'patryk-defend-367602-2',
  'patryk-defend-367602-9',
];

function replaceAllInString(text: string, mapping: Record<string, string>): string {
  let result = text;
  for (const [oldVal, newVal] of Object.entries(mapping)) {
    result = result.split(oldVal).join(newVal);
  }
  return result;
}

function deepReplaceStrings(
  obj: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = replaceAllInString(value, mapping);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') return replaceAllInString(item, mapping);
        if (typeof item === 'object' && item !== null) {
          return deepReplaceStrings(item as Record<string, unknown>, mapping);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = deepReplaceStrings(value as Record<string, unknown>, mapping);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function generateCopy(
  docs: NdjsonDocument[],
  copyIndex: number,
  baseTimeShiftMs: number,
  copyOffsetMs: number,
  isAlert: boolean
): Array<{ id: string; index: string; source: Record<string, unknown> }> {
  const totalShiftMs = baseTimeShiftMs + copyIndex * copyOffsetMs;

  // Build host name mapping for this copy
  const hostMapping: Record<string, string> = {};
  for (const host of ORIGINAL_HOSTS) {
    hostMapping[host] = `${host}-copy-${copyIndex + 1}`;
  }

  const timestampFields = isAlert ? ALERT_TIMESTAMP_FIELDS : EVENT_TIMESTAMP_FIELDS;

  return docs.map((doc) => {
    let source: Record<string, unknown> = JSON.parse(JSON.stringify(doc._source));

    // Shift timestamps
    for (const field of timestampFields) {
      if (source[field]) {
        source[field] = shiftTimestamp(source[field], totalShiftMs);
      }
    }

    // Shift nested event timestamps
    const event = source.event as Record<string, unknown> | undefined;
    if (event) {
      for (const ef of ['created', 'ingested']) {
        if (event[ef]) {
          event[ef] = shiftTimestamp(event[ef], totalShiftMs);
        }
      }
    }

    // Apply host remapping (deep replace to catch command lines, reasons, etc.)
    source = deepReplaceStrings(source, hostMapping);

    // New IDs
    const id = randomUUID().replace(/-/g, '');
    if (isAlert) {
      source['kibana.alert.uuid'] = id;
      source['kibana.alert.workflow_status'] = 'open';
      source['kibana.alert.workflow_tags'] = [];
      source['kibana.alert.case_ids'] = [];
      source['kibana.alert.workflow_assignee_ids'] = [];
      source['kibana.alert.status'] = 'active';
      source['kibana.alert.rule.execution.uuid'] = randomUUID();
    }

    // Add marker tag
    let tags = source.tags as string[] | undefined;
    if (!Array.isArray(tags)) {
      tags = [];
    }
    if (!tags.includes(INJECTED_TAG)) {
      tags.push(INJECTED_TAG);
    }
    source.tags = tags;

    return { id, index: isAlert ? DEFAULT_ALERT_INDEX : doc._index, source };
  });
}

async function cleanup(client: ESClient, dryRun: boolean): Promise<void> {
  const indices = [
    '.alerts-security.alerts-*',
    'logs-endpoint.events.process-*',
    'logs-endpoint.events.network-*',
    'logs-endpoint.events.file-*',
  ];

  for (const index of indices) {
    const { status, body } = await client.post(`/${index}/_count`, {
      query: { term: { tags: INJECTED_TAG } },
    });

    const count =
      status === 200 && typeof body === 'object' && body !== null
        ? ((body as Record<string, unknown>).count as number) ?? 0
        : 0;

    if (count === 0) continue;

    console.log(`  ${index}: ${count} scaled documents`);

    if (!dryRun) {
      const { body: delBody } = await client.post(`/${index}/_delete_by_query?refresh=true`, {
        query: { term: { tags: INJECTED_TAG } },
      });
      const deleted =
        typeof delBody === 'object' && delBody !== null
          ? ((delBody as Record<string, unknown>).deleted as number) ?? 0
          : 0;
      console.log(`  Deleted ${deleted} from ${index}`);
    } else {
      console.log(`  [DRY RUN] Would delete ${count} from ${index}`);
    }
  }
}

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const dryRun = args.dryRun;
  const doCleanup = args.flags.has('cleanup');
  const outputFile = args.extra.output;
  const copies = parseInt(args.extra.copies ?? '10', 10);
  const offsetMinutes = parseInt(args.extra['offset-minutes'] ?? '30', 10);
  const alertsOnly = args.flags.has('alerts-only');

  console.log(`Scale Dataset Generator`);
  console.log(`  Copies: ${copies}`);
  console.log(`  Offset between copies: ${offsetMinutes} minutes`);

  // Load base datasets
  const alertDocs = loadNdjson(ALERT_DATASET);
  console.log(`  Base alerts: ${alertDocs.length}`);

  let eventDocs: NdjsonDocument[] = [];
  if (!alertsOnly) {
    try {
      eventDocs = loadNdjson(EVENT_DATASET);
      console.log(`  Base endpoint events: ${eventDocs.length}`);
    } catch {
      console.warn(`  WARNING: Endpoint events dataset not found, generating alerts only`);
    }
  }

  const expectedAlerts = alertDocs.length * copies;
  const expectedEvents = eventDocs.length * copies;
  console.log(`\n  Expected output: ${expectedAlerts} alerts + ${expectedEvents} events = ${expectedAlerts + expectedEvents} total`);

  // Time shift: move latest alert to "now", then offset each copy
  const baseTimeShiftMs = computeTimeShiftMs(alertDocs);
  const copyOffsetMs = offsetMinutes * 60 * 1000;

  // Generate all copies
  const allAlerts: Array<{ id: string; index: string; source: Record<string, unknown> }> = [];
  const allEvents: Array<{ id: string; index: string; source: Record<string, unknown> }> = [];

  for (let i = 0; i < copies; i++) {
    const alerts = generateCopy(alertDocs, i, baseTimeShiftMs, copyOffsetMs, true);
    allAlerts.push(...alerts);

    if (eventDocs.length > 0) {
      const events = generateCopy(eventDocs, i, baseTimeShiftMs, copyOffsetMs, false);
      allEvents.push(...events);
    }
  }

  console.log(`\n  Generated: ${allAlerts.length} alerts + ${allEvents.length} events`);

  // Show host distribution
  const byHost: Record<string, number> = {};
  for (const { source } of allAlerts) {
    const host =
      typeof source.host === 'object' && source.host !== null
        ? ((source.host as Record<string, unknown>).name as string) ?? '?'
        : '?';
    byHost[host] = (byHost[host] ?? 0) + 1;
  }
  console.log(`\n  Hosts (${Object.keys(byHost).length}):`);
  for (const [host, count] of Object.entries(byHost).sort((a, b) => a[0].localeCompare(b[0])).slice(0, 10)) {
    console.log(`    ${host}: ${count}`);
  }
  if (Object.keys(byHost).length > 10) {
    console.log(`    ... and ${Object.keys(byHost).length - 10} more`);
  }

  // Output to file if requested
  if (outputFile) {
    const lines = [
      ...allAlerts.map((d) => JSON.stringify({ _id: d.id, _index: d.index, _source: d.source })),
      ...allEvents.map((d) => JSON.stringify({ _id: d.id, _index: d.index, _source: d.source })),
    ];
    writeFileSync(outputFile, lines.join('\n') + '\n');
    console.log(`\n  Written to ${outputFile}`);
    process.exit(0);
  }

  // Inject into cluster
  if (!args.esUrl) {
    console.error('ERROR: --es-url is required (or use --output for file output)');
    process.exit(1);
  }
  if (!args.apiKey && !(args.user && args.password)) {
    console.error('ERROR: Provide --api-key or --user + --password');
    process.exit(1);
  }

  const client = new ESClient({
    baseUrl: args.esUrl,
    apiKey: args.apiKey,
    user: args.user,
    password: args.password,
  });

  console.log(`\n── Connecting to ${args.esUrl} ──`);
  await checkCluster(client);

  if (doCleanup) {
    console.log(`\n── Cleaning up scaled data ──`);
    await cleanup(client, dryRun);
    process.exit(0);
  }

  // Inject alerts
  console.log(`\n── Injecting ${allAlerts.length} alerts ──`);
  const alertSuccess = await bulkInject(client, allAlerts, dryRun, 'scaled alerts');
  if (!dryRun) {
    console.log(`  Alerts injected: ${alertSuccess}/${allAlerts.length}`);
  }

  // Inject events
  if (allEvents.length > 0) {
    console.log(`\n── Injecting ${allEvents.length} endpoint events ──`);
    const eventSuccess = await bulkInject(client, allEvents, dryRun, 'scaled events');
    if (!dryRun) {
      console.log(`  Events injected: ${eventSuccess}/${allEvents.length}`);
    }
  }

  console.log(`\n── Done ──`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
