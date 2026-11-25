/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Replays a slice of generated alerts into an alert index on a clock, as rule executions would write them.
 *
 * The sweep selects alerts by `@timestamp` against "now", so the replayer moves the slice onto the wall clock:
 * an alert that is `d` after the start of the slice gets the timestamp `start of replay + d / speed`.
 * Each 5-minute window of the slice is one rule execution. The replayer writes it at the END of the window
 * (`start of replay + window end / speed`), so that no alert carries a timestamp in the future.
 *
 * Modes:
 * - real-time: speed 1. Use it for cache and guard measurements, because the sweep windows match production.
 * - fast: speed above 1 (default 60). Use it for throughput only. A compressed clock makes deduplication look
 *   better than it is, because alerts of one key arrive closer together.
 *
 * - backfill (`--backfill`, with `--slice-hours 24` for a full day): no waiting. All windows are written at once and
 *   the slice is shifted so that it ends now, with the real offsets between alerts kept. Use it to seed a stack.
 *
 * Safety: the script writes only when the cluster name of `--es` equals `--expect-cluster`. A Kibana started
 * without `--es-host` talks to the Elasticsearch on port 9200, which can belong to another session.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/replay_alerts_cli.js \
 *     --data <folder with alerts.ndjson> --es http://localhost:9220 --expect-cluster az-onweek \
 *     --index <alert index or data stream> [--mode real-time|fast] [--speed 60] [--slice-start-hour 0] \
 *     [--slice-hours 2] [--rule-map <rule_map.json>] [--space default] [--create-index-from <index>] [--backfill] [--dry-run]
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

import fs from 'fs';
import path from 'path';

const WINDOW_MS = 5 * 60 * 1000;
const DAY_START = Date.parse('2026-11-15T00:00:00.000Z');
const MODE_SPEEDS: Readonly<Record<string, number>> = { 'real-time': 1, fast: 60 };

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** The document of an alert as the generator writes it. */
export interface AlertSource {
  '@timestamp': string;
  'kibana.alert.rule.uuid'?: string;
  [field: string]: JsonValue | undefined;
}

export interface AlertLine {
  _id: string;
  _source: AlertSource;
}

export interface PlannedAlert extends AlertLine {
  offsetMs: number;
}

export interface ReplayArgs {
  data: string;
  es: string;
  expectCluster: string;
  index: string;
  mode: string;
  speed: number;
  sliceStartHour: number;
  sliceHours: number;
  ruleMap?: string;
  space: string;
  createIndexFrom?: string;
  dryRun: boolean;
  backfill: boolean;
}

export interface SlicePlan {
  sliceStart: number;
  windowCount: number;
  windows: Map<number, PlannedAlert[]>;
}

export type RuleMap = Readonly<Record<string, string>>;

type ValueFlagKey =
  | 'data'
  | 'es'
  | 'expectCluster'
  | 'index'
  | 'mode'
  | 'speed'
  | 'sliceStartHour'
  | 'sliceHours'
  | 'ruleMap'
  | 'space'
  | 'createIndexFrom';

type RawArgs = Partial<Record<ValueFlagKey, string>> & { dryRun: boolean; backfill: boolean };

interface EntryOfWindow {
  window: number;
  alerts: number;
  dueAt: string;
  wroteAt: string;
  bulkTookMs?: number;
}

interface BulkResult {
  errors: boolean;
  took: number;
  items: Array<{ create: { error?: { type: string } } }>;
}

interface ClusterInfo {
  cluster_name: string;
}

interface IndexMapping {
  mappings: Readonly<Record<string, JsonValue>>;
}

const FLAGS: Readonly<Record<string, ValueFlagKey>> = {
  '--data': 'data',
  '--es': 'es',
  '--expect-cluster': 'expectCluster',
  '--index': 'index',
  '--mode': 'mode',
  '--speed': 'speed',
  '--slice-start-hour': 'sliceStartHour',
  '--slice-hours': 'sliceHours',
  '--rule-map': 'ruleMap',
  '--space': 'space',
  '--create-index-from': 'createIndexFrom',
};

const REQUIRED: readonly ('data' | 'es' | 'expectCluster' | 'index')[] = [
  'data',
  'es',
  'expectCluster',
  'index',
];

export const parseArgs = (argv: readonly string[]): ReplayArgs => {
  const raw: RawArgs = {
    mode: 'real-time',
    sliceStartHour: '0',
    sliceHours: '2',
    space: 'default',
    dryRun: false,
    backfill: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const key = FLAGS[argv[i]];
    if (argv[i] === '--dry-run') raw.dryRun = true;
    else if (argv[i] === '--backfill') raw.backfill = true;
    else if (key) raw[key] = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  REQUIRED.forEach((name) => {
    if (!raw[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  const { data, es, expectCluster, index, mode = 'real-time', ruleMap, createIndexFrom } = raw;
  if (!MODE_SPEEDS[mode]) throw new Error(`--mode must be real-time or fast, got ${mode}`);
  const speed = Number(raw.speed ?? MODE_SPEEDS[mode]);
  if (!(speed >= 1)) throw new Error('--speed must be 1 or more');
  if (mode === 'real-time' && speed !== 1)
    throw new Error('real-time mode has speed 1; use --mode fast for another speed');
  if (raw.backfill && mode !== 'real-time')
    throw new Error(
      '--backfill keeps the real offsets between alerts, so use it with --mode real-time'
    );
  return {
    data: data ?? '',
    es: es ?? '',
    expectCluster: expectCluster ?? '',
    index: index ?? '',
    mode,
    speed,
    sliceStartHour: Number(raw.sliceStartHour),
    sliceHours: Number(raw.sliceHours),
    ...(ruleMap !== undefined ? { ruleMap } : {}),
    space: raw.space ?? 'default',
    ...(createIndexFrom !== undefined ? { createIndexFrom } : {}),
    dryRun: raw.dryRun,
    backfill: raw.backfill,
  };
};

type Client = (method: string, url: string, body?: string, contentType?: string) => Promise<string>;

const makeClient = (es: string): Client => {
  const auth = `Basic ${Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64')}`;
  return async (method, url, body, contentType = 'application/json') => {
    const response = await fetch(`${es}${url}`, {
      method,
      headers: { Authorization: auth, 'Content-Type': contentType },
      body,
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 500)}`);
    return text;
  };
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The alerts of the slice, grouped by 5-minute window (a window is one rule execution), oldest first. */
export const planSlice = (
  lines: readonly string[],
  args: Pick<ReplayArgs, 'sliceStartHour' | 'sliceHours'>
): SlicePlan => {
  const sliceStart = DAY_START + args.sliceStartHour * 3600 * 1000;
  const sliceEnd = sliceStart + args.sliceHours * 3600 * 1000;
  const windows = new Map<number, PlannedAlert[]>();
  lines.forEach((line) => {
    const { _id, _source } = JSON.parse(line) as AlertLine;
    const ts = Date.parse(_source['@timestamp']);
    if (ts < sliceStart || ts >= sliceEnd) return;
    const window = Math.floor((ts - sliceStart) / WINDOW_MS);
    const list = windows.get(window) ?? [];
    list.push({ _id, _source, offsetMs: ts - sliceStart });
    windows.set(window, list);
  });
  return { sliceStart, windowCount: (sliceEnd - sliceStart) / WINDOW_MS, windows };
};

/** The fields a rule execution adds to an alert and the dump has, so that the alert reads as a Security alert. */
export const withLiveFields = (
  source: AlertSource,
  ruleMap: RuleMap | undefined,
  space: string,
  timestamp: number
): AlertSource => {
  const generatedUuid = source['kibana.alert.rule.uuid'] ?? '';
  const ruleUuid = ruleMap ? ruleMap[generatedUuid] : generatedUuid;
  if (!ruleUuid) throw new Error(`rule ${generatedUuid} is not in the rule map`);
  const iso = new Date(timestamp).toISOString();
  return {
    ...source,
    '@timestamp': iso,
    'kibana.alert.rule.uuid': ruleUuid,
    'kibana.alert.start': iso,
    'kibana.alert.last_detected': iso,
    'kibana.alert.rule.execution.timestamp': iso,
    'kibana.alert.rule.rule_type_id': 'siem.queryRule',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.category': 'Custom Query Rule',
    'kibana.space_ids': [space],
  };
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const lines = fs
    .readFileSync(path.join(args.data, 'alerts.ndjson'), 'utf8')
    .split('\n')
    .filter(Boolean);
  const plan = planSlice(lines, args);
  const ruleMap = args.ruleMap
    ? (JSON.parse(fs.readFileSync(args.ruleMap, 'utf8')) as RuleMap)
    : undefined;
  const total = [...plan.windows.values()].reduce((sum, list) => sum + list.length, 0);
  const sizes = [...plan.windows.values()].map((list) => list.length).sort((a, b) => a - b);
  const summary = {
    mode: args.mode,
    speed: args.speed,
    sliceStart: new Date(plan.sliceStart).toISOString(),
    sliceHours: args.sliceHours,
    windows: plan.windowCount,
    windowsWithAlerts: plan.windows.size,
    alerts: total,
    alertsPerWindow: { median: sizes[Math.floor(sizes.length / 2)], max: sizes[sizes.length - 1] },
    backfill: args.backfill,
    wallClockMinutes: args.backfill
      ? 0
      : Number(((plan.windowCount * WINDOW_MS) / args.speed / 60000).toFixed(2)),
  };
  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({ dryRun: true, ...summary }, null, 2)}\n`);
    return;
  }

  const request = makeClient(args.es);
  const { cluster_name: cluster } = JSON.parse(await request('GET', '/')) as ClusterInfo;
  if (cluster !== args.expectCluster) {
    throw new Error(`refusing to write: cluster is "${cluster}", expected "${args.expectCluster}"`);
  }
  if (args.createIndexFrom) {
    const existing = JSON.parse(
      await request('GET', `/${args.createIndexFrom}/_mapping`)
    ) as Readonly<Record<string, IndexMapping>>;
    await request(
      'PUT',
      `/${args.index}`,
      JSON.stringify({
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          'index.mapping.total_fields.limit': 10000,
        },
        mappings: Object.values(existing)[0].mappings,
      })
    );
  }

  const replayStart = Date.now();
  const log: EntryOfWindow[] = [];
  for (let window = 0; window < plan.windowCount; window++) {
    // The execution ends at the end of its window. Wait for that moment.
    const dueAt = replayStart + ((window + 1) * WINDOW_MS) / args.speed;
    if (!args.backfill) await sleep(Math.max(0, dueAt - Date.now()));
    const alerts = plan.windows.get(window) ?? [];
    const entry: EntryOfWindow = {
      window,
      alerts: alerts.length,
      dueAt: new Date(dueAt).toISOString(),
      wroteAt: new Date().toISOString(),
    };
    if (alerts.length > 0) {
      const body = alerts
        .map(
          ({ _id, _source, offsetMs }) =>
            `${JSON.stringify({ create: { _id } })}\n${JSON.stringify(
              withLiveFields(
                _source,
                ruleMap,
                args.space,
                args.backfill
                  ? replayStart - args.sliceHours * 3600 * 1000 + offsetMs
                  : replayStart + offsetMs / args.speed
              )
            )}`
        )
        .join('\n');
      const result = JSON.parse(
        await request(
          'POST',
          `/${args.index}/_bulk?refresh=false`,
          `${body}\n`,
          'application/x-ndjson'
        )
      ) as BulkResult;
      if (result.errors) {
        throw new Error(
          `bulk errors in window ${window}: ${JSON.stringify(
            result.items.find((item) => item.create.error)
          )}`
        );
      }
      entry.bulkTookMs = result.took;
    }
    log.push(entry);
  }
  await request('POST', `/${args.index}/_refresh`);

  const manifest = {
    ...summary,
    replayStart: new Date(replayStart).toISOString(),
    replayEnd: new Date().toISOString(),
    cluster,
    index: args.index,
    windows: log,
  };
  fs.writeFileSync(
    path.join(args.data, `replay_manifest_${replayStart}.json`),
    JSON.stringify(manifest, null, 2)
  );
  process.stdout.write(
    `${JSON.stringify({
      ...summary,
      replayStart: manifest.replayStart,
      replayEnd: manifest.replayEnd,
      index: args.index,
    })}\n`
  );
};
