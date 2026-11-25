/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Offline test of the decision model (Jev) on its own, one field at a time. The Jev guard of the verdict
 * cache scores a reused alert and compares the score with the score of the first alert of its key. It fires when the two differ by
 * more than a threshold. This test shows which changes of one field move the score, so that the threshold and the question can
 * be chosen from data.
 *
 * A benign alert of the sample is scored, and then the same alert with one field changed. A change is `harmless` (a plausible
 * benign drift: another folder, another user, a version folder), `bad` (something that an analyst flags: a look-alike signer, a
 * download in the arguments, a folder of public files, Office as the parent, an external destination), or `ambiguous` (a new
 * hash, which content alone cannot tell apart). The truth is known by construction. The report gives, for each change and each
 * wording of the question, how far the score moves, and for each threshold the share of bad changes that the guard catches and
 * the share of harmless changes that it flags by mistake.
 *
 * Read it as a comparison between changes and wordings, and not as a rate for production. Synthetic data only: it goes to the QA
 * endpoint in `REMOTE_ES_URL` with the key in `REMOTE_ES_API_KEY`, only with `--confirm-data-ok`.
 *
 * Usage:
 *   REMOTE_ES_URL=... REMOTE_ES_API_KEY=... node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/jev_field_test_cli.js \
 *     --data <sample folder> --out <report.json> [--per-kind 40] [--seed 1] [--concurrency 3] [--endpoint <id>] \
 *     [--dry-run | --confirm-data-ok]
 */

import crypto from 'crypto';
import fs from 'fs';
import { getField } from '../../server/alert_triage/pattern_key';
import {
  WORDING_NAMES,
  alertInput,
  defaultPause,
  makeDecide,
  makeRetrier,
  mean,
  percentile,
  pool,
  readSample,
  round,
  share,
  type Decide,
  type SampleAlert,
  type WordingName,
} from './jev_experiment';
import { mulberry32 } from './seeded_random';

type Doc = Readonly<Record<string, unknown>>;

export type ChangeClass = 'harmless' | 'bad' | 'ambiguous';

export interface FieldChange {
  name: string;
  /** The field that the change touches, for the report. */
  field: string;
  class: ChangeClass;
  /** The changed copy of the alert, or `undefined` when the alert has no such field or the change does not apply to its kind. */
  apply: (doc: Doc, kind: string, random: () => number) => Doc | undefined;
}

/** The score moves by more than a threshold: the guard fires. The first value is the strict one, the second the plan's guard. */
export const GUARD_THRESHOLDS = [0.05, 0.15] as const;
export const BENIGN_LANE_MAX = 0.05;
export const ATTACK_LANE_MIN = 0.98;

// ---------------------------------------------------------------------------------------------
// The changes
// ---------------------------------------------------------------------------------------------

const text = (doc: Doc, field: string): string | undefined => {
  const value = getField(doc as Record<string, unknown>, field);
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const digits = (random: () => number, length: number): string =>
  Array.from({ length }, () => Math.floor(random() * 10)).join('');

const hex = (random: () => number, length: number): string =>
  Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('');

/** The kinds that have a process with a command line. */
const PROCESS_KINDS = ['process', 'file', 'registry'];

/** The field that holds the path of the program (or of the file, for a file alert), and the folder change that it takes. */
const pathFieldOf = (kind: string): string | undefined =>
  kind === 'file' ? 'file.path' : PROCESS_KINDS.includes(kind) ? 'process.executable' : undefined;

const splitPath = (path: string): { folder: string; name: string; separator: string } => {
  const index = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  const separator = path.includes('\\') ? '\\' : '/';
  return index < 0
    ? { folder: '', name: path, separator }
    : { folder: path.slice(0, index), name: path.slice(index + 1), separator };
};

const set = (doc: Doc, field: string, value: string): Doc => ({ ...doc, [field]: value });

const argumentChange = (name: string, suffix: string, changeClass: ChangeClass): FieldChange => ({
  name,
  field: 'process.command_line',
  class: changeClass,
  apply: (doc, kind) => {
    const line = text(doc, 'process.command_line');
    return line !== undefined && PROCESS_KINDS.includes(kind)
      ? set(doc, 'process.command_line', `${line} ${suffix}`)
      : undefined;
  },
});

const parentChange = (name: string, parent: string, changeClass: ChangeClass): FieldChange => ({
  name,
  field: 'process.parent.executable',
  class: changeClass,
  apply: (doc, kind) =>
    kind === 'process' && text(doc, 'process.parent.executable') !== undefined
      ? set(doc, 'process.parent.executable', parent)
      : undefined,
});

const destinationChange = (
  name: string,
  prefix: string,
  octets: number,
  changeClass: ChangeClass
): FieldChange => ({
  name,
  field: 'destination.ip',
  class: changeClass,
  apply: (doc, _kind, random) =>
    set(
      doc,
      'destination.ip',
      `${prefix}.${[...Array(octets)].map(() => Math.floor(random() * 250)).join('.')}`
    ),
});

export const CHANGES: readonly FieldChange[] = [
  {
    name: 'signer_lookalike',
    field: 'process.code_signature.subject_name',
    class: 'bad',
    // One letter doubled: "Acme Soft Inc." becomes "Acmme Soft Inc."
    apply: (doc, kind) => {
      const signer = text(doc, 'process.code_signature.subject_name');
      return kind === 'process' && signer !== undefined && signer.length > 3
        ? set(
            doc,
            'process.code_signature.subject_name',
            `${signer.slice(0, 3)}${signer[2]}${signer.slice(3)}`
          )
        : undefined;
    },
  },
  {
    name: 'signer_case',
    field: 'process.code_signature.subject_name',
    class: 'harmless',
    apply: (doc, kind) => {
      const signer = text(doc, 'process.code_signature.subject_name');
      return kind === 'process' && signer !== undefined
        ? set(doc, 'process.code_signature.subject_name', signer.toUpperCase())
        : undefined;
    },
  },
  argumentChange('argument_download', 'http://203.0.113.9/payload.exe', 'bad'),
  argumentChange('argument_verbose', '--verbose', 'harmless'),
  {
    name: 'folder_public',
    field: 'process.executable',
    class: 'bad',
    apply: (doc, kind) => {
      const field = pathFieldOf(kind);
      const path = field === undefined ? undefined : text(doc, field);
      if (field === undefined || path === undefined) return undefined;
      const { name, separator } = splitPath(path);
      return set(doc, field, `C:${separator}Users${separator}Public${separator}${name}`);
    },
  },
  {
    name: 'folder_version',
    field: 'process.executable',
    class: 'harmless',
    apply: (doc, kind) => {
      const field = pathFieldOf(kind);
      const path = field === undefined ? undefined : text(doc, field);
      if (field === undefined || path === undefined) return undefined;
      const { folder, name, separator } = splitPath(path);
      return set(doc, field, `${folder}${separator}v2${separator}${name}`);
    },
  },
  parentChange(
    'parent_office',
    'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE',
    'bad'
  ),
  parentChange('parent_service', 'C:\\Windows\\System32\\services.exe', 'harmless'),
  destinationChange('destination_external', '203.0.113', 1, 'bad'),
  destinationChange('destination_internal', '10.0', 2, 'harmless'),
  {
    name: 'account_other',
    field: 'cloud.account.id',
    class: 'harmless',
    apply: (doc, kind, random) =>
      kind === 'cloud' && text(doc, 'cloud.account.id') !== undefined
        ? set(doc, 'cloud.account.id', digits(random, 12))
        : undefined,
  },
  {
    name: 'user_other',
    field: 'user.name',
    class: 'harmless',
    apply: (doc, _kind, random) =>
      text(doc, 'user.name') !== undefined
        ? set(doc, 'user.name', `user${digits(random, 3)}`)
        : undefined,
  },
  {
    name: 'hash_new',
    field: 'process.hash.sha256',
    class: 'ambiguous',
    apply: (doc, kind, random) => {
      const field = kind === 'file' ? 'file.hash.sha256' : 'process.hash.sha256';
      return ['process', 'file'].includes(kind) && text(doc, field) !== undefined
        ? set(doc, field, hex(random, 64))
        : undefined;
    },
  },
];

// ---------------------------------------------------------------------------------------------
// Which alerts, and the report
// ---------------------------------------------------------------------------------------------

const seededRandom = (seed: number, name: string): (() => number) =>
  mulberry32(
    Number.parseInt(
      crypto.createHash('sha256').update(`${seed}|${name}`).digest('hex').slice(0, 8),
      16
    )
  );

/**
 * The benign alerts to change: harmless alerts of the sample that are not planted variants or hash updates, and that have a key
 * (the guard only works on a keyed alert). `perKind` caps the number of each kind, taken in a seeded random order.
 */
export const selectBases = (
  alerts: readonly SampleAlert[],
  { perKind, seed }: { perKind?: number; seed: number }
): SampleAlert[] => {
  const eligible = alerts.filter(
    ({ truth }) =>
      truth.verdict === 'false_positive' &&
      !truth.variant &&
      !truth.benign &&
      truth.kind !== 'aggregate'
  );
  const byKind = new Map<string, SampleAlert[]>();
  for (const alert of eligible)
    byKind.set(alert.truth.kind, [...(byKind.get(alert.truth.kind) ?? []), alert]);
  return [...byKind.entries()].flatMap(([kind, group]) => {
    const random = seededRandom(seed, `select|${kind}`);
    const shuffled = [...group]
      .map((alert) => ({ alert, key: random() }))
      .sort((a, b) => a.key - b.key)
      .map(({ alert }) => alert);
    return perKind === undefined ? shuffled : shuffled.slice(0, perKind);
  });
};

export interface BaseResult {
  id: string;
  kind: string;
  /** The scores of the unchanged alert, one for each repeat. */
  scores: Readonly<Record<WordingName, readonly number[]>>;
}

export interface ChangeResult {
  baseId: string;
  kind: string;
  change: string;
  /** The score of the changed alert in each wording that answered. */
  scores: Readonly<Partial<Record<WordingName, number>>>;
}

export interface ChangeSummary {
  class: ChangeClass;
  field: string;
  /** Kinds of alert that the change applied to, with the number of alerts. */
  kinds: Record<string, number>;
  n: number;
  meanBaseScore: number | null;
  meanChangedScore: number | null;
  meanAbsoluteDifference: number | null;
  p50: number | null;
  p90: number | null;
  /** Share of alerts whose score moved by more than each threshold. */
  movedMoreThan: Record<string, number | null>;
  /** Of the alerts that were in the benign lane before the change, the share that left it. */
  leftBenignLane: number | null;
  /** Share of changed alerts that reached the attack lane. */
  reachedAttackLane: number | null;
}

export interface ThresholdSummary {
  threshold: number;
  bad: { n: number; caught: number; caughtShare: number | null };
  harmless: { n: number; flagged: number; flaggedShare: number | null };
}

export interface FieldReport {
  baseAlerts: number;
  baseKinds: Record<string, number>;
  calls: number;
  failedCalls: number;
  failureReasons: Record<string, number>;
  /** The difference between two scores of the same unchanged alert: the noise to compare the changes with. */
  repeatSpread: Record<string, { p50: number | null; p95: number | null }>;
  perWording: Record<
    string,
    { changes: Record<string, ChangeSummary>; thresholds: ThresholdSummary[] }
  >;
}

const absoluteDifference = (changed: number, base: number): number => Math.abs(changed - base);

/** Pure: the report of a run. The calls to the model were made by the caller. */
export const buildFieldReport = ({
  bases,
  results,
  calls = 0,
  failedCalls = 0,
  failureReasons = {},
}: {
  bases: readonly BaseResult[];
  results: readonly ChangeResult[];
  calls?: number;
  failedCalls?: number;
  failureReasons?: Record<string, number>;
}): FieldReport => {
  const baseById = new Map(bases.map((base) => [base.id, base]));
  const classOf = new Map(CHANGES.map((change) => [change.name, change]));
  const baseKinds: Record<string, number> = {};
  bases.forEach(({ kind }) => (baseKinds[kind] = (baseKinds[kind] ?? 0) + 1));

  const perWording: FieldReport['perWording'] = {};
  const repeatSpread: FieldReport['repeatSpread'] = {};
  for (const wording of WORDING_NAMES) {
    const spread = bases.flatMap(({ scores }) => {
      const [first, second] = scores[wording];
      return first === undefined || second === undefined ? [] : [Math.abs(first - second)];
    });
    repeatSpread[wording] = { p50: percentile(spread, 0.5), p95: percentile(spread, 0.95) };

    // A pair of scores of one alert and one change, for each change that has an answer in this wording.
    const pairs = results.flatMap((result) => {
      const base = baseById.get(result.baseId);
      const change = classOf.get(result.change);
      const changed = result.scores[wording];
      const baseScores = base?.scores[wording] ?? [];
      return base === undefined ||
        change === undefined ||
        changed === undefined ||
        baseScores.length === 0
        ? []
        : [{ change, kind: result.kind, changed, base: mean(baseScores) }];
    });

    const changes: Record<string, ChangeSummary> = {};
    for (const change of CHANGES) {
      const own = pairs.filter((pair) => pair.change.name === change.name);
      if (own.length === 0) continue;
      const differences = own.map(({ changed, base }) => absoluteDifference(changed, base));
      const kinds: Record<string, number> = {};
      own.forEach(({ kind }) => (kinds[kind] = (kinds[kind] ?? 0) + 1));
      const inBenignLane = own.filter(({ base }) => base <= BENIGN_LANE_MAX);
      changes[change.name] = {
        class: change.class,
        field: change.field,
        kinds,
        n: own.length,
        meanBaseScore: round(mean(own.map(({ base }) => base))),
        meanChangedScore: round(mean(own.map(({ changed }) => changed))),
        meanAbsoluteDifference: round(mean(differences)),
        p50: percentile(differences, 0.5),
        p90: percentile(differences, 0.9),
        movedMoreThan: Object.fromEntries(
          GUARD_THRESHOLDS.map((threshold) => [
            String(threshold),
            share(
              differences.filter((difference) => difference > threshold).length,
              differences.length
            ),
          ])
        ),
        leftBenignLane: share(
          inBenignLane.filter(({ changed }) => changed > BENIGN_LANE_MAX).length,
          inBenignLane.length
        ),
        reachedAttackLane: share(
          own.filter(({ changed }) => changed >= ATTACK_LANE_MIN).length,
          own.length
        ),
      };
    }

    const thresholds = GUARD_THRESHOLDS.map((threshold): ThresholdSummary => {
      const moved = (changeClass: ChangeClass) => {
        const own = pairs.filter(({ change }) => change.class === changeClass);
        return {
          n: own.length,
          hits: own.filter(({ changed, base }) => absoluteDifference(changed, base) > threshold)
            .length,
        };
      };
      const bad = moved('bad');
      const harmless = moved('harmless');
      return {
        threshold,
        bad: { n: bad.n, caught: bad.hits, caughtShare: share(bad.hits, bad.n) },
        harmless: {
          n: harmless.n,
          flagged: harmless.hits,
          flaggedShare: share(harmless.hits, harmless.n),
        },
      };
    });
    perWording[wording] = { changes, thresholds };
  }

  return {
    baseAlerts: bases.length,
    baseKinds,
    calls,
    failedCalls,
    failureReasons,
    repeatSpread,
    perWording,
  };
};

// ---------------------------------------------------------------------------------------------
// The calls to the model
// ---------------------------------------------------------------------------------------------

/** The changes that apply to an alert, each with its changed copy. The random values are seeded by the alert and the change. */
export const changedCopies = (
  { id, doc, truth }: SampleAlert,
  seed: number
): Array<{ change: FieldChange; doc: Doc }> =>
  CHANGES.flatMap((change) => {
    const changed = change.apply(doc, truth.kind, seededRandom(seed, `${id}|${change.name}`));
    return changed === undefined ? [] : [{ change, doc: changed }];
  });

export const scoreFieldChanges = async ({
  bases,
  decide,
  seed,
  baseRepeats = 2,
  concurrency,
  pause = defaultPause,
}: {
  bases: readonly SampleAlert[];
  decide: Decide;
  seed: number;
  baseRepeats?: number;
  concurrency: number;
  pause?: (ms: number) => Promise<void>;
}): Promise<{
  bases: BaseResult[];
  results: ChangeResult[];
  calls: number;
  failedCalls: number;
  failureReasons: Record<string, number>;
}> => {
  const { tally, withRetry } = makeRetrier(pause);
  const baseResults: BaseResult[] = [];
  const results: ChangeResult[] = [];
  await pool(bases, concurrency, async (alert) => {
    const scores: Record<WordingName, number[]> = { choice: [], benign: [], indicator: [] };
    const input = alertInput(alert.doc);
    for (const wording of WORDING_NAMES) {
      for (let repeat = 0; repeat < baseRepeats; repeat++) {
        const decision = await withRetry(wording, () => decide(input, wording));
        if (decision !== undefined) scores[wording].push(decision.score);
      }
    }
    baseResults.push({ id: alert.id, kind: alert.truth.kind, scores });

    for (const { change, doc } of changedCopies(alert, seed)) {
      const changedInput = alertInput(doc);
      const changedScores: Partial<Record<WordingName, number>> = {};
      for (const wording of WORDING_NAMES) {
        const decision = await withRetry(wording, () => decide(changedInput, wording));
        if (decision !== undefined) changedScores[wording] = decision.score;
      }
      results.push({
        baseId: alert.id,
        kind: alert.truth.kind,
        change: change.name,
        scores: changedScores,
      });
    }
  });
  return { bases: baseResults, results, ...tally };
};

// ---------------------------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------------------------

type ValueFlagKey = 'data' | 'out' | 'perKind' | 'seed' | 'concurrency' | 'endpoint';

export const main = async (): Promise<void> => {
  const args: Partial<Record<ValueFlagKey, string>> = {
    seed: '1',
    concurrency: '3',
  };
  const flags: Readonly<Record<string, ValueFlagKey>> = {
    '--data': 'data',
    '--out': 'out',
    '--per-kind': 'perKind',
    '--seed': 'seed',
    '--concurrency': 'concurrency',
    '--endpoint': 'endpoint',
  };
  let dryRun = false;
  let confirmed = false;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--confirm-data-ok') confirmed = true;
    else if (flags[arg]) args[flags[arg]] = process.argv[++i];
    else throw new Error(`unknown argument ${arg}`);
  }
  const { data, out, endpoint } = args;
  if (!data || !out) throw new Error('--data <sample folder> and --out <report.json> are required');
  const seed = Number(args.seed);
  const perKind = args.perKind === undefined ? undefined : Number(args.perKind);

  const bases = selectBases(await readSample(data), { perKind, seed });
  const changeCount = bases.reduce((sum, alert) => sum + changedCopies(alert, seed).length, 0);
  const calls = (bases.length * 2 + changeCount) * WORDING_NAMES.length;
  process.stdout.write(
    `${bases.length} benign alerts, ${changeCount} changed copies, ${calls} calls to ${endpoint}\n`
  );
  if (dryRun || !confirmed) {
    const [example] = bases;
    const [first] = changedCopies(example, seed);
    process.stdout.write(
      `Example change ${first?.change.name ?? 'none'} on a ${example.truth.kind} alert:\n` +
        `${first ? alertInput(first.doc) : alertInput(example.doc)}\n` +
        (dryRun
          ? 'Dry run: nothing was sent.\n'
          : 'Nothing was sent: pass --confirm-data-ok to send this synthetic data to REMOTE_ES_URL.\n')
    );
    return;
  }
  const url = process.env.REMOTE_ES_URL;
  const apiKey = process.env.REMOTE_ES_API_KEY;
  if (!url || !apiKey) throw new Error('REMOTE_ES_URL and REMOTE_ES_API_KEY must be set');
  if (!url.startsWith('https://')) throw new Error('REMOTE_ES_URL must be an https URL');
  if (!endpoint) throw new Error('--endpoint <inference endpoint id> is required');

  const scored = await scoreFieldChanges({
    bases,
    decide: makeDecide({ url, apiKey, endpoint: endpoint ?? '' }),
    seed,
    concurrency: Number(args.concurrency),
  });
  const report = buildFieldReport(scored);
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${report.baseAlerts} alerts scored, ${report.failedCalls} of ${
      report.calls
    } calls failed ${JSON.stringify(report.failureReasons)}. Report written to ${out}\n`
  );
};
