/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Checks generated data against the phoenix profile with the same statistics as query pack 3.
 * It reads `alerts.ndjson` and recomputes queries 1 to 5 in JavaScript, with the same approximate key.
 * A ratio inside the tolerance (default 10%) passes. The exit code is 1 if any ratio fails.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/calibrate_cli.js \
 *     --profile <profile_phoenix.json> --data <folder with alerts.ndjson> [--tolerance 0.1]
 */

import fs from 'fs';
import path from 'path';

type FieldValue = string | number | boolean | string[];

/** An alert document with flat dotted field names, as in `alerts.ndjson`. */
type AlertSource = Record<string, FieldValue | undefined>;

interface Doc {
  d: AlertSource;
  key: string | undefined;
  ts: number;
}

interface Check {
  name: string;
  got: number;
  want: number;
  ratio: number;
}

interface KeyFact {
  size: number;
  fp: number;
  nonVariant: number;
  kind: string;
  bb: boolean;
}

interface TruthLine {
  keyId: string;
  kind: string;
  verdict: string;
  variant: string | null;
  benign: string | null;
}

interface Profile {
  totals: {
    alerts: number;
    buildingBlockShare: number;
    statusSeverityMix: Array<{
      buildingBlock: boolean;
      severity: string;
      status: string;
      alerts: number;
    }>;
  };
  targets: {
    open: {
      alerts: number;
      keyedShare: number;
      units5min: number;
      units1h: number;
      units24h: number;
    };
    unkeyedTotal: number;
    unkeyedRuleCount: number;
    top10UnkeyedShare: number;
  };
}

interface Meta {
  params: { hashUpdate: { minKeySize: number } };
}

const WINDOW_MS = 5 * 60 * 1000;
const HOUR_MS = 3600 * 1000;
const ENTRA_RULE = 'Entra ID Application Self-Assigned to Privileged Role';
// From the plan, "The size of the problem": the Entra ID rule has 2,173 units at 5 minutes and 44 at 24 hours.
const ENTRA_TARGET = { units5min: 2173, units24h: 44 };

const parseArgs = (
  argv: readonly string[]
): { profile: string; data: string; tolerance: number } => {
  let profile: string | undefined;
  let data: string | undefined;
  let tolerance = 0.1;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--profile') profile = argv[++i];
    else if (argv[i] === '--data') data = argv[++i];
    else if (argv[i] === '--tolerance') tolerance = Number(argv[++i]);
  }
  if (!profile || !data) throw new Error('--profile <file> and --data <folder> are required');
  return { profile, data, tolerance };
};

const first = (value: FieldValue | undefined): string | number | boolean | undefined =>
  Array.isArray(value) ? value[0] : value;
const has = (value: FieldValue | undefined | null): boolean =>
  value !== undefined && value !== null && value !== '';

/** The approximate strict key of pack 3 queries 2 to 4. It is not normalized, as in the queries. */
const approxKey = (d: AlertSource): string | undefined => {
  const path0 = [d['dll.path'], d['registry.path'], d['file.path'], d['process.executable']].find(
    has
  );
  const cloud =
    has(d['event.action']) && [d['cloud.account.id'], d['user.name']].some(has)
      ? `${d['event.action']}@${[d['cloud.account.id'], d['user.name']].find(has)}`
      : undefined;
  const ident = path0 ?? cloud;
  if (ident === undefined) return undefined;
  const signer =
    [
      d['process.code_signature.subject_name'],
      d['dll.code_signature.subject_name'],
      d['process.hash.sha256'],
      d['file.hash.sha256'],
      d['dll.hash.sha256'],
    ].find(has) ?? '';
  return [
    first(d['kibana.alert.rule.uuid']),
    first(d['kibana.alert.rule.revision']) ?? '',
    first(d['rule.id']) ?? first(d['event.code']) ?? '',
    ident,
    d['process.executable'] ?? '',
    signer,
    d['process.parent.executable'] ?? '',
  ].join('|');
};

const quantile = (sorted: number[], q: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

const unitsFor = (docs: Doc[], windowMs: number | null): { units: number; windows: number } => {
  const buckets = new Map<number, Set<string>>();
  docs.forEach(({ d, key, ts }) => {
    const bucket = windowMs === null ? 0 : Math.floor(ts / windowMs);
    const keys = buckets.get(bucket) ?? new Set<string>();
    buckets.set(bucket, keys);
    keys.add(key ?? `alert:${d['kibana.alert.uuid']}`);
  });
  return {
    units: [...buckets.values()].reduce((sum, set) => sum + set.size, 0),
    windows: buckets.size,
  };
};

export const main = (): void => {
  const args = parseArgs(process.argv);
  const profile = JSON.parse(fs.readFileSync(args.profile, 'utf8')) as Profile;
  const docs = fs
    .readFileSync(path.join(args.data, 'alerts.ndjson'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line): Doc => {
      const d = (JSON.parse(line) as { _source: AlertSource })._source;
      return { d, key: approxKey(d), ts: Date.parse(String(d['@timestamp'])) };
    });

  const notBlocks = docs.filter(({ d }) => !has(d['kibana.alert.building_block_type']));
  const open = notBlocks.filter(({ d }) => d['kibana.alert.workflow_status'] === 'open');
  const target = profile.targets.open;
  const rows: Check[] = [];
  const check = (name: string, got: number, want: number): number =>
    rows.push({ name, got, want, ratio: got / want });

  check('alerts in total', docs.length, profile.totals.alerts);
  check(
    'building-block share',
    (docs.length - notBlocks.length) / docs.length,
    profile.totals.buildingBlockShare
  );
  check('open alerts, no building blocks', open.length, target.alerts);
  check('open keyed share', open.filter(({ key }) => key).length / open.length, target.keyedShare);
  check('open units, 5-minute windows', unitsFor(open, WINDOW_MS).units, target.units5min);
  check('open units, 1-hour windows', unitsFor(open, HOUR_MS).units, target.units1h);
  check('open units, 24 hours', unitsFor(open, null).units, target.units24h);

  const entra = notBlocks.filter(({ d }) => d['kibana.alert.rule.name'] === ENTRA_RULE);
  check(
    'Entra ID units, 5-minute windows',
    unitsFor(entra, WINDOW_MS).units,
    ENTRA_TARGET.units5min
  );
  check('Entra ID units, 24 hours', unitsFor(entra, null).units, ENTRA_TARGET.units24h);

  const unkeyedByRule = new Map<string, number>();
  notBlocks
    .filter(({ key }) => !key)
    .forEach(({ d }) => {
      const name = String(d['kibana.alert.rule.name']);
      unkeyedByRule.set(name, (unkeyedByRule.get(name) ?? 0) + 1);
    });
  const unkeyedCounts = [...unkeyedByRule.values()].sort((a, b) => b - a);
  const unkeyedTotal = unkeyedCounts.reduce((a, b) => a + b, 0);
  check('unkeyed alerts, no building blocks', unkeyedTotal, profile.targets.unkeyedTotal);
  check('unkeyed rules', unkeyedCounts.length, profile.targets.unkeyedRuleCount);
  check(
    'top 10 unkeyed rules, share',
    unkeyedCounts.slice(0, 10).reduce((a, b) => a + b, 0) / unkeyedTotal,
    profile.targets.top10UnkeyedShare
  );

  // Exact match of query 1 (building block, severity, status).
  const cells = new Map<string, number>();
  docs.forEach(({ d }) => {
    const k = `${has(d['kibana.alert.building_block_type'])}|${d['kibana.alert.severity']}|${
      d['kibana.alert.workflow_status']
    }`;
    cells.set(k, (cells.get(k) ?? 0) + 1);
  });
  const cellMismatch = profile.totals.statusSeverityMix.filter(
    (r) => cells.get(`${r.buildingBlock}|${r.severity}|${r.status}`) !== r.alerts
  ).length;

  // Reported, not checked: the profile has no phoenix value for the alerts that one rule execution emits.
  const perExecution = new Map<string, number>();
  docs.forEach(({ d, ts }) => {
    const k = `${d['kibana.alert.rule.uuid']}|${Math.floor(ts / WINDOW_MS)}`;
    perExecution.set(k, (perExecution.get(k) ?? 0) + 1);
  });
  const sizes = [...perExecution.values()].sort((a, b) => a - b);

  // Reported, not checked: the 64% in the plan is a weekly figure from earlier packs, so a day must hold at least that share.
  const keySizes = new Map<string, number>();
  open
    .filter((doc): doc is Doc & { key: string } => Boolean(doc.key))
    .forEach(({ key }) => keySizes.set(key, (keySizes.get(key) ?? 0) + 1));
  const sortedKeySizes = [...keySizes.values()].sort((a, b) => a - b);

  // Reported, not checked: planted bad variants. The plan sets 0.5% of the alerts that can carry one.
  // Eligible: building-block excluded, false-positive key with a path (process, file, registry, library) and 10 or more alerts.
  const truthFile = path.join(args.data, 'truth.ndjson');
  const truth: TruthLine[] = fs.existsSync(truthFile)
    ? fs
        .readFileSync(truthFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as TruthLine)
    : [];
  const keyFacts = new Map<string, KeyFact>();
  truth.forEach((t, i) => {
    if (t.keyId.startsWith('unkeyed-')) return;
    const fact: KeyFact = keyFacts.get(t.keyId) ?? {
      size: 0,
      fp: 0,
      nonVariant: 0,
      kind: t.kind,
      bb: has(docs[i].d['kibana.alert.building_block_type']),
    };
    fact.size++;
    if (!t.variant) {
      fact.nonVariant++;
      if (t.verdict === 'false_positive') fact.fp++;
    }
    keyFacts.set(t.keyId, fact);
  });
  const isFpKey = (f: KeyFact): boolean => f.fp > 0 && f.fp === f.nonVariant;
  const planted: Record<string, number> = {};
  truth.forEach((t) => {
    if (t.variant) planted[t.variant] = (planted[t.variant] ?? 0) + 1;
  });
  const plantedTotal = Object.values(planted).reduce((a, b) => a + b, 0);
  const pathKinds = ['process', 'file', 'registry', 'library'];
  const fpKeyAlerts = [...keyFacts.values()].filter(isFpKey).reduce((sum, f) => sum + f.size, 0);
  const eligibleAlerts = [...keyFacts.values()]
    .filter((f) => isFpKey(f) && !f.bb && f.size >= 10 && pathKinds.includes(f.kind))
    .reduce((sum, f) => sum + f.size, 0);
  const harmlessAlerts = truth.filter((t) => t.benign === 'hash_update');
  const metaFile = path.join(args.data, 'meta.json');
  const minHashKeySize = fs.existsSync(metaFile)
    ? (JSON.parse(fs.readFileSync(metaFile, 'utf8')) as Meta).params.hashUpdate.minKeySize
    : 10;
  const eligibleHashKeys = [...keyFacts.values()].filter(
    (f) =>
      isFpKey(f) && !f.bb && f.size >= minHashKeySize && ['process', 'library'].includes(f.kind)
  ).length;
  const variants = truth.length
    ? {
        planted,
        plantedTotal,
        shareOfAllAlerts: Number((plantedTotal / truth.length).toFixed(5)),
        alertsInFalsePositiveKeys: fpKeyAlerts,
        shareOfFalsePositiveKeyAlerts: Number((plantedTotal / fpKeyAlerts).toFixed(5)),
        eligibleAlerts,
        shareOfEligibleAlerts: Number((plantedTotal / eligibleAlerts).toFixed(5)),
        // Harmless new hashes (software updates). They and the planted new_hash variants are the two kinds of
        // alert on which a hash guard fires: a guard that fires on the first is a false alarm.
        harmlessHashUpdates: {
          alerts: harmlessAlerts.length,
          keys: new Set(harmlessAlerts.map((t) => t.keyId)).size,
          eligibleKeys: eligibleHashKeys,
          shareOfEligibleKeys: Number(
            (new Set(harmlessAlerts.map((t) => t.keyId)).size / eligibleHashKeys).toFixed(4)
          ),
          plantedNewHashAlerts: planted.new_hash ?? 0,
        },
      }
    : undefined;

  const out = rows.map((r) => ({
    check: r.name,
    got: Number(r.got.toFixed(4)),
    want: Number(r.want.toFixed(4)),
    ratio: Number(r.ratio.toFixed(3)),
    pass: Math.abs(r.ratio - 1) <= args.tolerance,
  }));
  process.stdout.write(
    `${JSON.stringify(
      {
        tolerance: args.tolerance,
        queryOneCellsMismatched: cellMismatch,
        variants,
        openKeyedKeys: {
          keys: sortedKeySizes.length,
          shareWithOneAlert: Number(
            (sortedKeySizes.filter((n) => n === 1).length / sortedKeySizes.length).toFixed(3)
          ),
          p50: quantile(sortedKeySizes, 0.5),
          p90: quantile(sortedKeySizes, 0.9),
          max: sortedKeySizes[sortedKeySizes.length - 1],
        },
        alertsPerRuleWindow: {
          p50: quantile(sizes, 0.5),
          p95: quantile(sizes, 0.95),
          max: sizes[sizes.length - 1],
        },
        checks: out,
      },
      null,
      2
    )}\n`
  );
  process.exit(out.every((r) => r.pass) && cellMismatch === 0 ? 0 : 1);
};

main();
