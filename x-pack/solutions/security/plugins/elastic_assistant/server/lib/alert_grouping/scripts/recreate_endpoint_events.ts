/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Inject endpoint events (process, network, file) into a target cluster.
 *
 * These events provide the context data that the triage prompt's ES|QL queries
 * rely on (process trees, network connections, file system activity).
 *
 * Usage:
 *   npx tsx recreate_endpoint_events.ts --es-url http://localhost:9200 --user elastic --password changeme
 *   npx tsx recreate_endpoint_events.ts --es-url http://localhost:9200 --user elastic --password changeme --cleanup
 *   npx tsx recreate_endpoint_events.ts --es-url http://localhost:9200 --user elastic --password changeme --dry-run
 */

import { resolve } from 'path';
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
const DATASET_FILE = resolve(SCRIPT_DIR, 'endpoint_events_dataset.ndjson');
const INJECTED_TAG = 'demo-recreated';

const EVENT_TIMESTAMP_FIELDS = ['@timestamp', 'event.created', 'event.ingested'];

function prepareEvent(
  doc: NdjsonDocument,
  deltaMs: number | null
): { id: string; index: string; source: Record<string, unknown> } {
  const source: Record<string, unknown> = JSON.parse(JSON.stringify(doc._source));

  // Shift timestamps
  if (deltaMs) {
    for (const field of EVENT_TIMESTAMP_FIELDS) {
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

  // Add marker tag for cleanup
  let tags = source.tags as string[] | undefined;
  if (!Array.isArray(tags)) {
    tags = [];
  }
  if (!tags.includes(INJECTED_TAG)) {
    tags.push(INJECTED_TAG);
  }
  source.tags = tags;

  return {
    id: randomUUID().replace(/-/g, ''),
    index: doc._index,
    source,
  };
}

async function cleanupEvents(client: ESClient, dryRun: boolean): Promise<number> {
  const indices = [
    'logs-endpoint.events.process-*',
    'logs-endpoint.events.network-*',
    'logs-endpoint.events.file-*',
  ];

  let totalDeleted = 0;

  for (const index of indices) {
    const { status: countStatus, body: countBody } = await client.post(`/${index}/_count`, {
      query: { term: { tags: INJECTED_TAG } },
    });

    const count =
      countStatus === 200 && typeof countBody === 'object' && countBody !== null
        ? ((countBody as Record<string, unknown>).count as number) ?? 0
        : 0;

    if (count === 0) continue;

    console.log(`  ${index}: ${count} injected events`);

    if (dryRun) {
      console.log(`  [DRY RUN] Would delete ${count} events from ${index}`);
      continue;
    }

    const { status, body } = await client.post(`/${index}/_delete_by_query?refresh=true`, {
      query: { term: { tags: INJECTED_TAG } },
    });

    if (status === 200 && typeof body === 'object' && body !== null) {
      const deleted = ((body as Record<string, unknown>).deleted as number) ?? 0;
      totalDeleted += deleted;
      console.log(`  Deleted ${deleted} from ${index}`);
    }
  }

  return totalDeleted;
}

async function main(): Promise<void> {
  const args = parseConnectionArgs(process.argv);
  const dryRun = args.dryRun;
  const cleanup = args.flags.has('cleanup');
  const noTimeShift = args.flags.has('no-time-shift');

  // Load dataset
  const rawDocs = loadNdjson(args.extra.dataset ?? DATASET_FILE);
  console.log(`Loaded ${rawDocs.length} endpoint events`);

  // Categorize
  const byType: Record<string, number> = {};
  for (const doc of rawDocs) {
    const idx = doc._index;
    const type = idx.includes('process')
      ? 'process'
      : idx.includes('network')
      ? 'network'
      : idx.includes('file')
      ? 'file'
      : 'other';
    byType[type] = (byType[type] ?? 0) + 1;
  }
  console.log(
    `  Breakdown: ${Object.entries(byType)
      .map(([t, c]) => `${t}=${c}`)
      .join(', ')}`
  );

  // Connect
  if (!args.esUrl) {
    console.error('ERROR: --es-url is required');
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
  const healthy = await checkCluster(client);
  if (!healthy && !dryRun) {
    process.exit(1);
  }

  // Cleanup
  if (cleanup) {
    console.log(`\n── Cleaning up endpoint events ──`);
    const deleted = await cleanupEvents(client, dryRun);
    if (!dryRun) {
      console.log(`\n  Total deleted: ${deleted}`);
    }
    process.exit(0);
  }

  // Compute time shift
  const deltaMs = noTimeShift ? null : computeTimeShiftMs(rawDocs);
  if (deltaMs) {
    const hours = deltaMs / (1000 * 60 * 60);
    console.log(`Time shift: +${hours.toFixed(1)} hours`);
  }

  // Prepare
  const prepared = rawDocs.map((doc) => prepareEvent(doc, deltaMs));

  // Inject
  console.log(`\n── Injecting ${prepared.length} endpoint events ──`);
  const success = await bulkInject(client, prepared, dryRun, 'endpoint events');

  if (!dryRun) {
    console.log(`\n  Successfully injected: ${success}/${prepared.length} events`);
  }

  console.log(`\n── Done ──`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
