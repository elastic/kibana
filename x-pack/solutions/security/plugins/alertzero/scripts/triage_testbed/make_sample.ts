/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Takes a stratified sample of generated alerts for a calibration run on a real model and for the
 * check that the content of the alerts matches the truth. The Alert Triage worker does not take a random sample: it plans
 * one batch per rule in the order of its plan, so a run on the whole day over-represents the first rules (in the smoke test
 * only 4% of the analyzed alerts were true positives, against 17.6% in the day). The sample fixes that:
 *
 * - it takes rules of every kind of alert (process, file, registry, library, cloud, and the aggregation rules without a key)
 * - inside a rule it takes all planted variants and all harmless hash updates first (up to a cap), then true positives up to a
 *   share of the rule (`truePositiveShare`), then false positives, spread over the keys of the rule (at most `perKey` per key)
 * - it leaves building-block alerts out
 *
 * Because the worker batches by rule, a sample of `rules` rules is about `rules` model calls. The output folder has the same
 * layout as a generated day (`alerts.ndjson`, `truth.ndjson`, `rules.json`, `rule_map.json`), so that `replay_alerts_cli.js --backfill`
 * and `reset_triage_state_cli.js` take it as `--data`. The same seed gives the same sample.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/make_sample_cli.js \
 *     --data <generated day> --out <sample folder> [--seed 1] [--per-rule 25] [--true-positive-share 0.4] \
 *     [--rules-per-kind '{"process":8,"file":3,"registry":3,"library":2,"cloud":4,"aggregate":4}'] [--only-kinds cloud,aggregate]
 *   `--only-kinds` keeps only these kinds of the sample as selected, so that a rerun on some kinds uses the SAME alerts as the full sample. [--only-kinds cloud,aggregate]
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { JsonValue } from './replay_alerts';
import { mulberry32 } from './seeded_random';

/** The truth of a generated alert, as `truth.ndjson` holds it. */
export interface AlertTruth {
  id: string;
  verdict: string;
  variant: string | null;
  benign: string | null;
  keyId: string;
  ruleUuid: string;
  kind: string;
}

/** A generated alert with its truth. */
export interface SampleRecord {
  alert: { _id: string; _source: Readonly<Record<string, JsonValue | undefined>> };
  truth: AlertTruth;
}

/** A record read from the files of a generated day, with its two source lines. */
export interface FileRecord extends SampleRecord {
  line: string;
  truthLine: string;
}

export type RulesPerKind = Readonly<Record<string, number>>;

export interface SelectSampleOptions<R extends SampleRecord> {
  records: readonly R[];
  seed?: number;
  perRule?: number;
  truePositiveShare?: number;
  perKey?: number;
  rulesPerKind?: RulesPerKind;
}

export interface SampleSummary {
  alerts: number;
  rules: number;
  truePositives: number;
  truePositiveShare: number;
  plantedVariants: Record<string, number>;
  harmlessHashUpdates: number;
  byKind: Record<string, { alerts: number; truePositive: number }>;
}

type ValueFlagKey =
  | 'data'
  | 'out'
  | 'seed'
  | 'perRule'
  | 'truePositiveShare'
  | 'rulesPerKind'
  | 'onlyKinds';

type SampleArgs = Partial<Record<ValueFlagKey, string>>;

export const DEFAULT_RULES_PER_KIND: RulesPerKind = {
  process: 8,
  file: 3,
  registry: 3,
  library: 2,
  cloud: 4,
  aggregate: 4,
};
const VARIANT_CAP = 6;
const BENIGN_CAP = 6;

const seededRandom = (seed: number, name: string): (() => number) =>
  mulberry32(crypto.createHash('sha256').update(`${seed}|${name}`).digest().readUInt32BE(0));

const shuffle = <T>(list: readonly T[], random: () => number): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** At most `perKey` alerts of each key, taking one of every key before a second of any (round-robin). */
const spreadOverKeys = <R extends SampleRecord>(
  alerts: readonly R[],
  perKey: number,
  random: () => number
): R[] => {
  const byKey = new Map<string, R[]>();
  shuffle(alerts, random).forEach((record) => {
    const list = byKey.get(record.truth.keyId) ?? [];
    list.push(record);
    byKey.set(record.truth.keyId, list);
  });
  const lists = shuffle([...byKey.values()], random);
  const out: R[] = [];
  for (let round = 0; round < perKey; round++) {
    lists.forEach((list) => {
      if (list[round]) out.push(list[round]);
    });
  }
  return out;
};

/**
 * @param records `[{ alert: { _id, _source }, truth: { id, verdict, variant, benign, keyId, ruleUuid, kind } }]`
 * @returns the selected records, in the order of the input
 */
export const selectSample = <R extends SampleRecord>({
  records,
  seed = 1,
  perRule = 25,
  truePositiveShare = 0.4,
  perKey = 4,
  rulesPerKind = DEFAULT_RULES_PER_KIND,
}: SelectSampleOptions<R>): R[] => {
  const candidates = records.filter(
    (record) => !record.alert._source['kibana.alert.building_block_type']
  );
  const byRule = new Map<string, R[]>();
  candidates.forEach((record) => {
    const list = byRule.get(record.truth.ruleUuid) ?? [];
    list.push(record);
    byRule.set(record.truth.ruleUuid, list);
  });

  // Rules by kind. A rule that has variants, harmless changes and both verdicts tells most, so those come first.
  const richness = (list: readonly R[]): number =>
    list.filter((r) => r.truth.variant).length * 2 +
    list.filter((r) => r.truth.benign).length +
    Math.min(
      list.filter((r) => r.truth.verdict === 'true_positive').length,
      list.filter((r) => r.truth.verdict === 'false_positive').length
    );
  const ruleRandom = seededRandom(seed, 'rules');
  const chosen: Array<[string, R[]]> = [];
  Object.entries(rulesPerKind).forEach(([kind, count]) => {
    const rules = shuffle(
      [...byRule.entries()].filter(([, list]) => list[0].truth.kind === kind && list.length >= 8),
      ruleRandom
    ).sort((a, b) => richness(b[1]) - richness(a[1]));
    chosen.push(...rules.slice(0, count));
  });

  const selected = new Set<R>();
  chosen.forEach(([ruleUuid, list]) => {
    const random = seededRandom(seed, `alerts|${ruleUuid}`);
    const pick: R[] = [];
    const exempt = (record: R): boolean => Boolean(record.truth.variant || record.truth.benign);
    const take = (picked: readonly R[]): void => {
      picked.forEach((record) => {
        if (pick.length >= perRule || pick.includes(record)) return;
        // At most `perKey` ordinary alerts of a key over all the stages of the pick. Variants and harmless changes are the point of the sample.
        const sameKey = pick.filter(
          (p) => p.truth.keyId === record.truth.keyId && !exempt(p)
        ).length;
        if (!exempt(record) && sameKey >= perKey) return;
        pick.push(record);
      });
    };
    take(
      shuffle(
        list.filter((r) => r.truth.variant),
        random
      ).slice(0, VARIANT_CAP)
    );
    take(
      shuffle(
        list.filter((r) => r.truth.benign),
        random
      ).slice(0, BENIGN_CAP)
    );
    const truePositiveGoal = Math.round(perRule * truePositiveShare);
    const alreadyTruePositive = pick.filter((r) => r.truth.verdict === 'true_positive').length;
    take(
      spreadOverKeys(
        list.filter((r) => r.truth.verdict === 'true_positive' && !r.truth.variant),
        perKey,
        random
      ).slice(0, Math.max(0, truePositiveGoal - alreadyTruePositive))
    );
    take(
      spreadOverKeys(
        list.filter((r) => r.truth.verdict === 'false_positive' && !r.truth.benign),
        perKey,
        random
      )
    );
    // A rule with too few false positives is filled up with its remaining true positives.
    take(spreadOverKeys(list, perKey, random));
    pick.forEach((record) => selected.add(record));
  });
  return records.filter((record) => selected.has(record));
};

/** Keeps only the records of the given kinds, in the same order. The selection does not change: the same rules and the same alerts. */
export const filterKinds = <R extends SampleRecord>(
  selected: readonly R[],
  kinds: readonly string[]
): R[] => selected.filter((record) => kinds.includes(record.truth.kind));

export const summarize = (selected: readonly SampleRecord[]): SampleSummary => {
  const count = (fn: (record: SampleRecord) => string | boolean | null): number =>
    selected.filter(fn).length;
  const kinds: Record<string, { alerts: number; truePositive: number }> = {};
  selected.forEach((r) => {
    kinds[r.truth.kind] = kinds[r.truth.kind] ?? { alerts: 0, truePositive: 0 };
    kinds[r.truth.kind].alerts++;
    if (r.truth.verdict === 'true_positive') kinds[r.truth.kind].truePositive++;
  });
  const variants: Record<string, number> = {};
  selected.forEach(({ truth: { variant } }) => {
    if (variant) variants[variant] = (variants[variant] ?? 0) + 1;
  });
  return {
    alerts: selected.length,
    rules: new Set(selected.map((r) => r.truth.ruleUuid)).size,
    truePositives: count((r) => r.truth.verdict === 'true_positive'),
    truePositiveShare: Number(
      (count((r) => r.truth.verdict === 'true_positive') / selected.length).toFixed(3)
    ),
    plantedVariants: variants,
    harmlessHashUpdates: count((r) => r.truth.benign),
    byKind: kinds,
  };
};

const readLines = async (file: string): Promise<string[]> => {
  const lines: string[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) if (line) lines.push(line);
  return lines;
};

export const main = async (): Promise<void> => {
  const args: SampleArgs = { seed: '1', perRule: '25', truePositiveShare: '0.4' };
  const flags: Readonly<Record<string, ValueFlagKey>> = {
    '--data': 'data',
    '--out': 'out',
    '--seed': 'seed',
    '--per-rule': 'perRule',
    '--true-positive-share': 'truePositiveShare',
    '--rules-per-kind': 'rulesPerKind',
    '--only-kinds': 'onlyKinds',
  };
  for (let i = 2; i < process.argv.length; i++) {
    const key = flags[process.argv[i]];
    if (!key) throw new Error(`unknown argument ${process.argv[i]}`);
    args[key] = process.argv[++i];
  }
  const { data, out, onlyKinds } = args;
  if (!data || !out) throw new Error('--data <folder> and --out <folder> are required');
  const seed = Number(args.seed);
  const perRule = Number(args.perRule);
  const truePositiveShare = Number(args.truePositiveShare);
  const rulesPerKind =
    typeof args.rulesPerKind === 'string'
      ? (JSON.parse(args.rulesPerKind) as RulesPerKind)
      : DEFAULT_RULES_PER_KIND;

  const alertLines = await readLines(path.join(data, 'alerts.ndjson'));
  const truthLines = await readLines(path.join(data, 'truth.ndjson'));
  if (alertLines.length !== truthLines.length)
    throw new Error('alerts.ndjson and truth.ndjson differ in length');
  const records: FileRecord[] = alertLines.map((line, i) => ({
    line,
    alert: JSON.parse(line) as SampleRecord['alert'],
    truth: JSON.parse(truthLines[i]) as AlertTruth,
    truthLine: truthLines[i],
  }));
  const all = selectSample({ records, seed, perRule, truePositiveShare, rulesPerKind });
  const selected = onlyKinds ? filterKinds(all, onlyKinds.split(',')) : all;

  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'alerts.ndjson'), `${selected.map((r) => r.line).join('\n')}\n`);
  fs.writeFileSync(
    path.join(out, 'truth.ndjson'),
    `${selected.map((r) => r.truthLine).join('\n')}\n`
  );
  ['rules.json', 'rule_map.json'].forEach((file) => {
    if (fs.existsSync(path.join(data, file)))
      fs.copyFileSync(path.join(data, file), path.join(out, file));
  });
  const summary = {
    sourceDay: path.basename(data),
    seed,
    perRule,
    truePositiveShareSetting: truePositiveShare,
    ...summarize(selected),
  };
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};
