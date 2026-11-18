/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Offline replay of the alert dump with the real strict key code (`pattern_key.ts`).
 *
 * It simulates the verdict cache record: the first alert of a strict key that has an LLM verdict
 * (false or true positive) is the representative and starts a record that lives for the window.
 * Every later verdict alert of the key inside the window is compared with that record. After the
 * record expires, the next verdict alert starts a new one.
 *
 * Output is aggregate counts only. No key, path, host or user value is printed or written.
 * The dump is real alert data: keep the input and every file made from it out of git and cloud sync.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/offline_replay_cli.js \
 *     --data <dump or generated alerts file> [--truth <truth.ndjson>] [--windows 24,1] [--out <file.json>]
 *
 * With `--truth`, the verdict of an alert is its true verdict (generated data), not a verdict tag.
 * The report also gives each window without the largest key, because one very large key can decide the hit share.
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import {
  buildPatternKeys,
  describePatternKey,
  getField,
} from '../../server/alert_triage/pattern_key';

type Verdict = 'fp' | 'tp' | 'inc';

/** An alert document of the dump or of generated data, with flat dotted field names. */
interface DumpDoc {
  '@timestamp': string;
  'kibana.alert.workflow_tags'?: string[];
  [field: string]: string | number | boolean | string[] | undefined;
}

interface ReplayAlert {
  ts: number;
  severity: string;
  building: boolean;
  verdict: Verdict | null;
  strict: string | null;
  kind: string;
}

interface Bucket {
  verdictAlerts: number;
  hits: number;
  matrix: Record<string, number>;
}

interface WindowResult {
  total: Bucket;
  byKind: Record<string, Bucket>;
  bySeverity: Record<string, Bucket>;
}

interface Direction {
  records: number;
  share: number | null;
}

interface Report {
  generatedAt: string;
  input: string;
  alerts: number;
  spanHours: number;
  buildingBlocks: number;
  withVerdict: number;
  verdicts: Record<string, number>;
  strictKeyKinds: Record<string, number>;
  verdictAlertsWithStrictKey: number;
  keyMixing: ReturnType<typeof keyMixing>;
  windows: Record<string, WindowResult>;
  largestKey?: { verdictAlerts: number; shareOfVerdictAlertsWithKey: number };
  directions?: Record<
    string,
    {
      falsePositiveRecordMetTruePositive: Direction;
      truePositiveRecordMetFalsePositive: Direction;
    }
  >;
  hitShareSummary?: Record<
    string,
    {
      hitShareWithLargestKey: number | null;
      hitShareWithoutLargestKey: number | null;
      disagreementWithLargestKey: number | null;
      disagreementWithoutLargestKey: number | null;
    }
  >;
}

interface ReplayArgs {
  data: string;
  windows: number[];
  out?: string;
  truth?: string;
}

const HOUR_MS = 3600 * 1000;
const VERDICT_TAGS: Record<string, Verdict> = {
  'az:false_positive': 'fp',
  'az:true_positive': 'tp',
  'az:inconclusive': 'inc',
};

const parseArgs = (argv: readonly string[]): ReplayArgs => {
  let data: string | undefined;
  let windows = [24, 1];
  let out: string | undefined;
  let truth: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--data') data = argv[++i];
    else if (argv[i] === '--windows') windows = argv[++i].split(',').map(Number);
    else if (argv[i] === '--out') out = argv[++i];
    else if (argv[i] === '--truth') truth = argv[++i];
  }
  if (!data) throw new Error('--data <path to the dump data.json> is required');
  return { data, windows, out, truth };
};

const TRUTH_VERDICTS: Record<string, Verdict> = { false_positive: 'fp', true_positive: 'tp' };

const loadTruth = async (file: string): Promise<Map<string, Verdict>> => {
  const verdicts = new Map<string, Verdict>();
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const { id, verdict } = JSON.parse(line) as { id: string; verdict: string };
    verdicts.set(id, TRUTH_VERDICTS[verdict]);
  }
  return verdicts;
};

const loadAlerts = async (file: string, truthFile: string | undefined): Promise<ReplayAlert[]> => {
  const truth = truthFile ? await loadTruth(truthFile) : undefined;
  const alerts: ReplayAlert[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const { _id: id, _source: doc } = JSON.parse(line) as { _id: string; _source: DumpDoc };
    const tags = doc['kibana.alert.workflow_tags'] || [];
    const verdict = truth
      ? truth.get(id) ?? null
      : tags.map((tag) => VERDICT_TAGS[tag]).find(Boolean) ?? null;
    const { strict } = buildPatternKeys(doc);
    alerts.push({
      ts: Date.parse(doc['@timestamp']),
      severity: (getField(doc, 'kibana.alert.severity') as string | undefined) ?? 'unknown',
      building: Boolean(getField(doc, 'kibana.alert.building_block_type')),
      verdict,
      strict: strict ?? null,
      kind: strict ? describePatternKey(strict).kind : 'none',
    });
  }
  return alerts.sort((a, b) => a.ts - b.ts);
};

const bump = (map: Map<string, number>, key: string, by = 1): Map<string, number> =>
  map.set(key, (map.get(key) || 0) + by);

const newBucket = (): Bucket => ({
  verdictAlerts: 0,
  hits: 0,
  // record verdict -> fresh verdict
  matrix: { 'fp>fp': 0, 'fp>tp': 0, 'fp>inc': 0, 'tp>tp': 0, 'tp>fp': 0, 'tp>inc': 0 },
});

const replayWindow = (alerts: ReplayAlert[], windowHours: number): WindowResult => {
  const windowMs = windowHours * HOUR_MS;
  const records = new Map<string, { verdict: Verdict; createdAt: number }>(); // strict key -> { verdict, createdAt }
  const total = newBucket();
  const byKind = new Map<string, Bucket>();
  const bySeverity = new Map<string, Bucket>();
  const bucketOf = (map: Map<string, Bucket>, key: string): Bucket => {
    const bucket = map.get(key) ?? newBucket();
    map.set(key, bucket);
    return bucket;
  };

  for (const alert of alerts) {
    if (!alert.strict || alert.verdict === null) continue;
    const buckets = [total, bucketOf(byKind, alert.kind), bucketOf(bySeverity, alert.severity)];
    buckets.forEach((b) => b.verdictAlerts++);

    const record = records.get(alert.strict);
    const live = record && alert.ts - record.createdAt <= windowMs;
    if (live) {
      buckets.forEach((b) => {
        b.hits++;
        b.matrix[`${record.verdict}>${alert.verdict}`]++;
      });
      continue;
    }
    // Only a false or true positive starts a record. An inconclusive verdict never does.
    if (alert.verdict === 'fp' || alert.verdict === 'tp') {
      records.set(alert.strict, { verdict: alert.verdict, createdAt: alert.ts });
    }
  }
  return { total, byKind: Object.fromEntries(byKind), bySeverity: Object.fromEntries(bySeverity) };
};

/** Share of strict keys with both verdicts, among keys with 2 or more fp/tp verdicts (the key-level flip rate). */
const keyMixing = (
  alerts: ReplayAlert[]
): {
  keysWithVerdicts: number;
  keysWithTwoOrMore: number;
  keysMixed: number;
  shareKeysMixed: number | null;
  minorityShareOfAlerts: number | null;
} => {
  const perKey = new Map<string, { fp: number; tp: number }>();
  for (const a of alerts) {
    if (!a.strict || (a.verdict !== 'fp' && a.verdict !== 'tp')) continue;
    const entry = perKey.get(a.strict) || { fp: 0, tp: 0 };
    entry[a.verdict]++;
    perKey.set(a.strict, entry);
  }
  let repeated = 0;
  let mixed = 0;
  let minorityAlerts = 0;
  let repeatedAlerts = 0;
  for (const { fp, tp } of perKey.values()) {
    if (fp + tp < 2) continue;
    repeated++;
    repeatedAlerts += fp + tp;
    minorityAlerts += Math.min(fp, tp);
    if (fp > 0 && tp > 0) mixed++;
  }
  return {
    keysWithVerdicts: perKey.size,
    keysWithTwoOrMore: repeated,
    keysMixed: mixed,
    shareKeysMixed: repeated ? mixed / repeated : null,
    minorityShareOfAlerts: repeatedAlerts ? minorityAlerts / repeatedAlerts : null,
  };
};

/** The strict key with the most verdict alerts, and how many it has. */
const largestKey = (alerts: ReplayAlert[]): { key: string | null; size: number } => {
  const sizes = new Map<string, number>();
  alerts.forEach((a) => {
    if (a.strict && a.verdict !== null) bump(sizes, a.strict);
  });
  const [key, size]: [string | null, number] = [...sizes.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0] ?? [null, 0];
  return { key, size };
};

const hitShare = ({ hits, verdictAlerts }: Bucket): number | null =>
  verdictAlerts ? hits / verdictAlerts : null;
const disagreement = ({ hits, matrix }: Bucket): number | null =>
  hits ? (matrix['fp>tp'] + matrix['tp>fp']) / hits : null;

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const alerts = await loadAlerts(args.data, args.truth);
  const withVerdict = alerts.filter((a) => a.verdict !== null);

  const countBy = (
    list: ReplayAlert[],
    fn: (alert: ReplayAlert) => string | null
  ): Record<string, number> => {
    const map = new Map<string, number>();
    list.forEach((item) => bump(map, String(fn(item))));
    return Object.fromEntries(map);
  };

  const report: Report = {
    generatedAt: new Date().toISOString(),
    input: path.basename(args.data),
    alerts: alerts.length,
    spanHours: (alerts[alerts.length - 1].ts - alerts[0].ts) / HOUR_MS,
    buildingBlocks: alerts.filter((a) => a.building).length,
    withVerdict: withVerdict.length,
    verdicts: countBy(withVerdict, (a) => a.verdict),
    strictKeyKinds: countBy(alerts, (a) => a.kind),
    verdictAlertsWithStrictKey: withVerdict.filter((a) => a.strict).length,
    keyMixing: keyMixing(alerts),
    windows: Object.fromEntries(args.windows.map((h) => [`${h}h`, replayWindow(alerts, h)])),
  };

  const largest = largestKey(alerts);
  const withoutLargest = alerts.filter((a) => a.strict !== largest.key);
  report.largestKey = {
    verdictAlerts: largest.size,
    shareOfVerdictAlertsWithKey: largest.size / report.verdictAlertsWithStrictKey,
  };
  // The two directions of disagreement, given the verdict of the record. A false-positive record that meets a
  // true-positive fresh verdict is the case that decides a wrong reuse: the record would have hidden a true positive.
  // These are pair rates, not error rates against the truth (the dump has no truth).
  report.directions = Object.fromEntries(
    args.windows.map((h) => {
      const { matrix } = report.windows[`${h}h`].total;
      const share = (wrong: number, right: number): number | null =>
        wrong + right ? wrong / (wrong + right) : null;
      return [
        `${h}h`,
        {
          falsePositiveRecordMetTruePositive: {
            records: matrix['fp>fp'] + matrix['fp>tp'],
            share: share(matrix['fp>tp'], matrix['fp>fp']),
          },
          truePositiveRecordMetFalsePositive: {
            records: matrix['tp>tp'] + matrix['tp>fp'],
            share: share(matrix['tp>fp'], matrix['tp>tp']),
          },
        },
      ];
    })
  );
  report.hitShareSummary = Object.fromEntries(
    args.windows.map((h) => {
      const without = replayWindow(withoutLargest, h).total;
      const withKey = report.windows[`${h}h`].total;
      return [
        `${h}h`,
        {
          hitShareWithLargestKey: hitShare(withKey),
          hitShareWithoutLargestKey: hitShare(without),
          disagreementWithLargestKey: disagreement(withKey),
          disagreementWithoutLargestKey: disagreement(without),
        },
      ];
    })
  );

  const text = JSON.stringify(report, null, 2);
  if (args.out) fs.writeFileSync(args.out, text);
  process.stdout.write(`${text}\n`);
};
