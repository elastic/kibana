/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mutation tests of the verdict cache guards (plan, Thursday tasks 4 and 6). They answer: when a record of a false positive
 * covers a key, which bad variants does the novelty guard catch, which does it miss, and how often does it stop an alert that
 * was right to reuse (a false alarm, which costs model work and saves nothing)?
 *
 * It is offline: no stack, no model. It runs the real code (`nextCacheAction`, `noveltyValuesOfAlert`, `checkNovelty` and the key
 * builder) on a generated day, in the order of time, per strict key. The model is assumed to be right (the verdict of an alert is
 * its truth, at a confidence of 0.95), because the guard is tested, not the model. Three views:
 *
 * 1. False alarms. Every benign alert that arrives after the record of its key is active, unchanged, is checked. A guard hit on
 *    it is a false alarm. The harmless hash updates of the generator are reported on their own. Two ways to fill the lists are
 *    measured: `on` (an alert that the guard lets through is reused and adds nothing, an alert that fires is analyzed and adds
 *    its values) and `shadow` (every alert is analyzed and adds its values).
 * 2. Planted variants of the generator, in place: the alerts that the generator made bad (`truth.variant`) and that reach a
 *    key with an active record. Caught, missed, or split off by the key.
 * 3. Mutations: a benign alert of a key with an active record is changed in fields outside the key to a known bad variant. The
 *    mutated alert is tested against the lists of the record when it became active (`early`, the best case for the guard) and
 *    against the lists at the end of the day (`late`, the worst case). A mutation that changes the strict key is split off by the
 *    key: it no longer meets the record, which is a catch by the key and not by the guard.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/mutation_test_cli.js \
 *     (--data <generated day folder> | --dump <real dump file>) --out <report.json> [--seed 1]
 *   With --dump the alerts are real, the verdict of an alert is the tag that the model gave, and the report holds counts only.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import {
  HASH_FIELD,
  NOVELTY_SOURCE_FIELDS,
  TRUSTED_FIELD,
  checkNovelty,
  noveltyValuesOfAlert,
} from '../../server/alert_triage/novelty_guard';
import {
  PATTERN_KEY_FIELDS,
  buildPatternKeys,
  describePatternKey,
  getField,
  type PatternKeyKind,
  type PatternKeyPathKind,
} from '../../server/alert_triage/pattern_key';
import { hashKey } from '../../server/alert_triage/key_tags';
import {
  mergeNovelty,
  nextCacheAction,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import { mulberry32 } from './seeded_random';

type Doc = Record<string, unknown>;

export interface SimAlert {
  id: string;
  /** Epoch milliseconds. */
  timestamp: number;
  doc: Doc;
  truth: {
    verdict: 'true_positive' | 'false_positive';
    variant: string | null;
    benign: string | null;
  };
}

const FLOOR = 0.85;
const CONFIDENCE = 0.95;
const SPACE = 'default';

const kindOf = (strictKey: string): PatternKeyKind =>
  describePatternKey(strictKey).kind as PatternKeyKind;

const isPathKind = (kind: PatternKeyKind): kind is PatternKeyPathKind => kind !== 'cloud';

// ---------------------------------------------------------------------------------------------
// The mutations
// ---------------------------------------------------------------------------------------------

export type MutationName =
  | 'new_hash'
  | 'untrusted_signer'
  | 'encoded_command_line'
  | 'different_script_same_shape'
  | 'new_destination'
  | 'new_parent'
  | 'new_user_and_host';

interface Mutation {
  /** True for the control: a change that the guard must not fire on. */
  control?: boolean;
  /**
   * A benign alert that the record has seen before the mutation is tested, when the mutation needs one that the data does not
   * hold. It is added to the lists, and the mutation is applied to it.
   */
  benignBase?: (doc: Doc, random: () => number) => Doc | undefined;
  /** The changed copy of the alert, or `undefined` when the mutation does not apply to this alert. */
  apply: (doc: Doc, kind: PatternKeyKind, random: () => number) => Doc | undefined;
}

const hex = (random: () => number, length: number): string =>
  Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('');

const QUOTED = /"[^"]*"/;

export const MUTATIONS: Readonly<Record<MutationName, Mutation>> = {
  // A new file with the same path and a valid signature. The key holds no hash when a signer is present.
  new_hash: {
    apply: (doc, kind, random) =>
      isPathKind(kind) ? { ...doc, [HASH_FIELD[kind]]: hex(random, 64) } : undefined,
  },
  // The signature turns invalid. The key splits it off for the process and library kinds (the strict key holds the flag when it
  // is false), and the guard sees it for the other kinds.
  untrusted_signer: {
    apply: (doc, kind) => (isPathKind(kind) ? { ...doc, [TRUSTED_FIELD[kind]]: false } : undefined),
  },
  encoded_command_line: {
    apply: (doc, kind, random) =>
      isPathKind(kind)
        ? {
            ...doc,
            'process.command_line': `powershell.exe -enc ${Buffer.from(
              hex(random, 60),
              'hex'
            ).toString('base64')}`,
          }
        : undefined,
  },
  // Another script with the same switches. The shape hides the quoted value, so the guard cannot see it by design. The
  // benign command lines of the generated data hold no quoted script, so the benign base is one that runs a script
  // (`<program> -file "<path>"`), and the mutation runs another script with the same switches.
  different_script_same_shape: {
    benignBase: (doc, random) => {
      const executable = getField(doc, 'process.executable');
      if (typeof executable !== 'string') return undefined;
      const program = executable.split(/[\\/]/).pop();
      return {
        ...doc,
        'process.command_line': `${program} -file "C:\\Tools\\${hex(random, 6)}.ps1"`,
      };
    },
    apply: (doc, kind, random) => {
      const line = getField(doc, 'process.command_line');
      if (!isPathKind(kind) || typeof line !== 'string' || !QUOTED.test(line)) return undefined;
      return {
        ...doc,
        'process.command_line': line.replace(QUOTED, `"C:\\Users\\Public\\${hex(random, 6)}.ps1"`),
      };
    },
  },
  new_destination: {
    apply: (doc, _kind, random) => ({
      ...doc,
      'destination.ip': `203.0.113.${Math.floor(random() * 250)}`,
    }),
  },
  // The process key holds the parent, so the change only applies to the other kinds.
  new_parent: {
    apply: (doc, kind) =>
      isPathKind(kind) && kind !== 'process'
        ? { ...doc, 'process.parent.executable': 'C:\\Users\\Public\\launcher.exe' }
        : undefined,
  },
  // Benign software runs on many users and hosts. The guard must not fire.
  new_user_and_host: {
    control: true,
    apply: (doc) => ({ ...doc, 'user.name': 'user-mutation', 'host.name': 'host-mutation' }),
  },
};

export const MUTATION_NAMES = Object.keys(MUTATIONS) as MutationName[];

// ---------------------------------------------------------------------------------------------
// The simulation of one key
// ---------------------------------------------------------------------------------------------

type Lists = Readonly<Record<string, readonly string[]>>;

/** How an alert that the guard does not stop is treated. See the header. */
export type ListMode = 'on' | 'shadow';

export interface Tally {
  tested: number;
  /** The mutated alert has another strict key, so it never meets the record. */
  splitByKey: number;
  caught: number;
  missed: number;
  /** For caught alerts: how many times each field fired. */
  byField: Record<string, number>;
}

const emptyTally = (): Tally => ({ tested: 0, splitByKey: 0, caught: 0, missed: 0, byField: {} });

const add = (target: Record<string, number>, key: string): void => {
  target[key] = (target[key] ?? 0) + 1;
};

const tallyTest = (
  tally: Tally,
  { key, strictKey }: { key: string | undefined; strictKey: string },
  fired: readonly string[]
): void => {
  tally.tested++;
  if (key !== strictKey) {
    tally.splitByKey++;
  } else if (fired.length > 0) {
    tally.caught++;
    fired.forEach((field) => add(tally.byField, field));
  } else {
    tally.missed++;
  }
};

export interface KeyOutcome {
  kind: PatternKeyKind;
  /** The record became active (two agreeing runs). */
  activated: boolean;
  /** Benign alerts that arrived after the record was active, and how many of them fired the guard. */
  later: number;
  falseAlarms: number;
  falseAlarmFields: Record<string, number>;
  /** The harmless hash updates among the later benign alerts. */
  hashUpdates: { later: number; fired: number };
  /** The lists when the record became active, and at the end of the key, with the benign alert to mutate in each. */
  early?: { lists: Lists; base: SimAlert };
  late?: { lists: Lists; base: SimAlert };
  planted: Array<{
    variant: string;
    state: 'no_active_record' | 'caught' | 'missed';
    fired: string[];
  }>;
}

const strictOf = (doc: Doc): string | undefined => buildPatternKeys(doc).strict;

/**
 * Plays the alerts of one strict key in the order of time. A benign alert starts the record (run 1), activates it (run 2),
 * and after that is checked by the guard. A planted variant is checked when the record is active. The record is built by the
 * real state machine.
 */
export const simulateKey = ({
  alerts,
  strictKey,
  mode,
}: {
  alerts: readonly SimAlert[];
  strictKey: string;
  mode: ListMode;
}): KeyOutcome => {
  const kind = kindOf(strictKey);
  const keyHash = hashKey(SPACE, strictKey);
  const outcome: KeyOutcome = {
    kind,
    activated: false,
    later: 0,
    falseAlarms: 0,
    falseAlarmFields: {},
    hashUpdates: { later: 0, fired: 0 },
    planted: [],
  };
  let record: VerdictCacheRecord | undefined;
  let lastBenign: SimAlert | undefined;

  for (const alert of [...alerts].sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  )) {
    const now = new Date(alert.timestamp);
    const values = noveltyValuesOfAlert(alert.doc);
    const active = record?.state === 'active';

    if (alert.truth.variant) {
      if (!active || record === undefined) {
        outcome.planted.push({
          variant: alert.truth.variant,
          state: 'no_active_record',
          fired: [],
        });
      } else {
        const { fired } = checkNovelty({ lists: record.novelty, values });
        outcome.planted.push({
          variant: alert.truth.variant,
          state: fired.length > 0 ? 'caught' : 'missed',
          fired,
        });
      }
      continue; // the model catches a variant, so it adds nothing to the lists
    }
    if (alert.truth.verdict !== 'false_positive') continue;

    if (!active || record === undefined) {
      const action = nextCacheAction({
        existing: record,
        fresh: { alertId: alert.id, classification: 'false_positive', confidenceScore: CONFIDENCE },
        keyHash,
        strictKey,
        floor: FLOOR,
        now,
        noveltyValues: values,
      });
      if (action.type === 'write') {
        record = action.record;
        if (action.record.state === 'active') {
          outcome.activated = true;
          outcome.early = { lists: action.record.novelty, base: alert };
        }
      }
      lastBenign = alert;
      continue;
    }

    const { fired } = checkNovelty({ lists: record.novelty, values });
    outcome.later++;
    const isHashUpdate = alert.truth.benign === 'hash_update';
    if (isHashUpdate) outcome.hashUpdates.later++;
    if (fired.length > 0) {
      outcome.falseAlarms++;
      fired.forEach((field) => add(outcome.falseAlarmFields, field));
      if (isHashUpdate) outcome.hashUpdates.fired++;
    }
    // `shadow`: every alert is analyzed and adds its values. `on`: only an alert that fires is analyzed.
    if (mode === 'shadow' || fired.length > 0) {
      record = { ...record, novelty: mergeNovelty(record.novelty, values) };
    }
    lastBenign = alert;
  }

  if (outcome.activated && record !== undefined && lastBenign !== undefined) {
    outcome.late = { lists: record.novelty, base: lastBenign };
  }
  return outcome;
};

// ---------------------------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------------------------

export interface MutationReport {
  seed: number;
  alerts: number;
  keys: { withBenignAlerts: number; activated: number };
  falseAlarms: Record<
    ListMode,
    {
      laterBenignAlerts: number;
      falseAlarms: number;
      falseAlarmShare: number | null;
      byField: Record<string, number>;
      byKind: Record<string, { later: number; falseAlarms: number }>;
      hashUpdates: { later: number; fired: number };
    }
  >;
  /** The planted variants of the generator, in place. */
  plantedVariants: Record<
    string,
    {
      alerts: number;
      ownKey: number;
      noActiveRecord: number;
      caught: number;
      missed: number;
      byField: Record<string, number>;
    }
  >;
  /** Changes of benign alerts, by mutation, when the lists are early (just activated) or late (end of the day), by kind. */
  mutations: Record<
    MutationName,
    {
      control: boolean;
      notApplicable: number;
      early: Record<string, Tally>;
      late: Record<string, Tally>;
    }
  >;
}

const share = (part: number, whole: number): number | null =>
  whole === 0 ? null : Number((part / whole).toFixed(4));

const ALL = 'all';

/** Pure: builds the report of a set of alerts. */
export const buildMutationReport = (alerts: readonly SimAlert[], seed = 1): MutationReport => {
  const byKey = new Map<string, SimAlert[]>();
  const ownKeyVariants: SimAlert[] = [];
  for (const alert of alerts) {
    if (alert.truth.verdict === 'true_positive' && !alert.truth.variant) continue;
    const strict = strictOf(alert.doc);
    if (strict === undefined) continue;
    byKey.set(strict, [...(byKey.get(strict) ?? []), alert]);
  }
  // A planted variant on a key that has no benign alert has its own key: no record can cover it.
  for (const [strictKey, group] of byKey) {
    if (group.every(({ truth }) => truth.variant)) {
      ownKeyVariants.push(...group);
      byKey.delete(strictKey);
    }
  }

  const modes: ListMode[] = ['on', 'shadow'];
  const falseAlarms = Object.fromEntries(
    modes.map((mode) => [
      mode,
      {
        laterBenignAlerts: 0,
        falseAlarms: 0,
        falseAlarmShare: null as number | null,
        byField: {} as Record<string, number>,
        byKind: {} as Record<string, { later: number; falseAlarms: number }>,
        hashUpdates: { later: 0, fired: 0 },
      },
    ])
  ) as MutationReport['falseAlarms'];

  const planted: MutationReport['plantedVariants'] = {};
  const plantedEntry = (variant: string) =>
    (planted[variant] = planted[variant] ?? {
      alerts: 0,
      ownKey: 0,
      noActiveRecord: 0,
      caught: 0,
      missed: 0,
      byField: {},
    });
  for (const alert of ownKeyVariants) {
    const entry = plantedEntry(String(alert.truth.variant));
    entry.alerts++;
    entry.ownKey++;
  }

  const random = mulberry32(
    Number.parseInt(
      crypto.createHash('sha256').update(`mutation|${seed}`).digest('hex').slice(0, 8),
      16
    )
  );
  const mutations = Object.fromEntries(
    MUTATION_NAMES.map((name) => [
      name,
      {
        control: MUTATIONS[name].control === true,
        notApplicable: 0,
        early: {} as Record<string, Tally>,
        late: {} as Record<string, Tally>,
      },
    ])
  ) as MutationReport['mutations'];

  let withBenign = 0;
  let activated = 0;
  for (const [strictKey, group] of byKey) {
    if (!group.some(({ truth }) => !truth.variant)) continue;
    withBenign++;
    for (const mode of modes) {
      const outcome = simulateKey({ alerts: group, strictKey, mode });
      const target = falseAlarms[mode];
      target.laterBenignAlerts += outcome.later;
      target.falseAlarms += outcome.falseAlarms;
      target.hashUpdates.later += outcome.hashUpdates.later;
      target.hashUpdates.fired += outcome.hashUpdates.fired;
      for (const [field, count] of Object.entries(outcome.falseAlarmFields)) {
        target.byField[field] = (target.byField[field] ?? 0) + count;
      }
      const kindEntry = (target.byKind[outcome.kind] = target.byKind[outcome.kind] ?? {
        later: 0,
        falseAlarms: 0,
      });
      kindEntry.later += outcome.later;
      kindEntry.falseAlarms += outcome.falseAlarms;

      if (mode !== 'on') continue;
      if (outcome.activated) activated++;
      for (const { variant, state, fired } of outcome.planted) {
        const entry = plantedEntry(variant);
        entry.alerts++;
        if (state === 'no_active_record') entry.noActiveRecord++;
        else if (state === 'caught') {
          entry.caught++;
          fired.forEach((field) => add(entry.byField, field));
        } else entry.missed++;
      }
      for (const phase of ['early', 'late'] as const) {
        const snapshot = outcome[phase];
        if (snapshot === undefined) continue;
        for (const name of MUTATION_NAMES) {
          const { benignBase } = MUTATIONS[name];
          const base = benignBase ? benignBase(snapshot.base.doc, random) : snapshot.base.doc;
          const lists =
            base && benignBase
              ? mergeNovelty(snapshot.lists, noveltyValuesOfAlert(base))
              : snapshot.lists;
          const mutated = base && MUTATIONS[name].apply(base, outcome.kind, random);
          if (mutated === undefined) {
            if (phase === 'early') mutations[name].notApplicable++;
            continue;
          }
          const fired = checkNovelty({ lists, values: noveltyValuesOfAlert(mutated) }).fired;
          for (const kind of [outcome.kind, ALL]) {
            const bucket = mutations[name][phase];
            tallyTest(
              (bucket[kind] = bucket[kind] ?? emptyTally()),
              { key: strictOf(mutated), strictKey },
              fired
            );
          }
        }
      }
    }
  }

  for (const mode of modes) {
    const target = falseAlarms[mode];
    target.falseAlarmShare = share(target.falseAlarms, target.laterBenignAlerts);
  }
  return {
    seed,
    alerts: alerts.length,
    keys: { withBenignAlerts: withBenign, activated },
    falseAlarms,
    plantedVariants: planted,
    mutations,
  };
};

// ---------------------------------------------------------------------------------------------
// Files and the command line
// ---------------------------------------------------------------------------------------------

const KEPT_FIELDS: readonly string[] = [
  ...new Set([...PATTERN_KEY_FIELDS, ...NOVELTY_SOURCE_FIELDS, '@timestamp']),
];

/** The generated day, with only the fields that the key and the guard read, so that 160,000 alerts fit in memory. */
export const readDay = async (folder: string): Promise<SimAlert[]> => {
  const truth = new Map<string, SimAlert['truth']>();
  const truthReader = readline.createInterface({
    input: fs.createReadStream(path.join(folder, 'truth.ndjson')),
    crlfDelay: Infinity,
  });
  for await (const line of truthReader) {
    if (!line) continue;
    const { id, verdict, variant, benign } = JSON.parse(line) as SimAlert['truth'] & { id: string };
    truth.set(id, { verdict, variant, benign });
  }
  const alerts: SimAlert[] = [];
  const reader = readline.createInterface({
    input: fs.createReadStream(path.join(folder, 'alerts.ndjson')),
    crlfDelay: Infinity,
  });
  for await (const line of reader) {
    if (!line) continue;
    const { _id, _source } = JSON.parse(line) as { _id: string; _source: Doc };
    const known = truth.get(_id);
    if (known === undefined) throw new Error(`alert ${_id} has no truth record`);
    const doc: Doc = {};
    for (const field of KEPT_FIELDS) {
      const value = getField(_source, field);
      if (value !== undefined) doc[field] = value;
    }
    alerts.push({
      id: _id,
      timestamp: Date.parse(String(doc['@timestamp'])),
      doc,
      truth: known,
    });
  }
  return alerts;
};

const VERDICT_TAGS: Readonly<Record<string, SimAlert['truth']['verdict']>> = {
  'az:false_positive': 'false_positive',
  'az:true_positive': 'true_positive',
};

/**
 * The alerts of the real dump (`{ _id, _source }` lines), with the verdict that the model gave as the truth. An alert with no
 * false or true positive tag is left out. The dump is real alert data: nothing of it is printed or written, only counts.
 */
export const readDump = async (file: string): Promise<SimAlert[]> => {
  const alerts: SimAlert[] = [];
  const reader = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (const line of reader) {
    if (!line) continue;
    const { _id, _source } = JSON.parse(line) as { _id: string; _source: Doc };
    const tags = getField(_source, 'kibana.alert.workflow_tags');
    const verdict = (Array.isArray(tags) ? tags : [tags])
      .map((tag) => VERDICT_TAGS[String(tag)])
      .find(Boolean);
    if (verdict === undefined) continue;
    const doc: Doc = {};
    for (const field of KEPT_FIELDS) {
      const value = getField(_source, field);
      if (value !== undefined) doc[field] = value;
    }
    alerts.push({
      id: _id,
      timestamp: Date.parse(String(doc['@timestamp'])),
      doc,
      truth: { verdict, variant: null, benign: null },
    });
  }
  return alerts;
};

export const main = async (): Promise<void> => {
  const args: Record<string, string> = { '--seed': '1' };
  for (let i = 2; i < process.argv.length; i += 2) {
    if (!['--data', '--dump', '--out', '--seed'].includes(process.argv[i])) {
      throw new Error(`unknown argument ${process.argv[i]}`);
    }
    args[process.argv[i]] = process.argv[i + 1];
  }
  const { '--data': data, '--dump': dump, '--out': out } = args;
  if ((!data && !dump) || !out) {
    throw new Error(
      '--data <generated day folder> or --dump <dump file>, and --out <file>, are required'
    );
  }
  const alerts = data ? await readDay(data) : await readDump(String(dump));
  const report = buildMutationReport(alerts, Number(args['--seed']));
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  const { on, shadow } = report.falseAlarms;
  process.stdout.write(
    `${report.alerts} alerts, ${report.keys.withBenignAlerts} keys, ${report.keys.activated} active.\n` +
      `False alarms: on ${on.falseAlarms} of ${on.laterBenignAlerts}, shadow ${shadow.falseAlarms} of ${shadow.laterBenignAlerts}.\n` +
      `Report written to ${out}\n`
  );
};
