/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How often do run 1 and run 2 of a strict key disagree, and why? The verdict cache makes a record of a
 * key from the verdict of its first alert (run 1) and makes it active only when the next alert of the key, in a later batch (run 2),
 * gets the same verdict at the confidence floor. Anything else makes the key unstable. Run 2 is another alert, so a disagreement
 * holds two causes, and this analysis tells them apart with the truth of the generated alerts:
 *
 * - the key is too coarse: the two alerts have a different truth (a bad variant in a benign key). The model is not at fault.
 * - the model is noisy: the two alerts have the same truth, and the model gives a different verdict to one of them.
 * - the confidence gate: the two alerts have the same truth, and the second answer is inconclusive or under the floor.
 *
 * It also counts the dangerous case that no disagreement shows: both runs agree and the record becomes active, but the two alerts
 * have a different truth (the model missed a bad variant in both runs, or in one of them), so the record covers a mixed key.
 *
 * Two sources of runs: the real Haiku verdicts of a calibration run on a sample (the verdicts are in the stored analysis steps),
 * and the records that the shadow run of the cache left in the decisions index (the fake model).
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/key_disagreement_cli.js --out <report.json> \
 *     (--haiku-window <from>,<to> --data <sample folder> | --records <generated day folder> --from <ISO> --to <ISO>) \
 *     [--es http://localhost:9200]
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import {
  describePatternKey,
  buildPatternKeys,
  getField,
} from '../../server/alert_triage/pattern_key';
import { toCacheVerdict } from '../../server/alert_triage/verdict_cache';
import { readCacheData } from './report_cache';
import { makeClient, type EsRequest } from './report_run';

const FLOOR = 0.85;

export type Truth = 'true_positive' | 'false_positive';

/** What the model said about one alert: the classification and the confidence of the verdict. */
export interface Answer {
  classification: string;
  confidence: number;
}

/** The two alerts that make the record of one key, with what the model said about each and what is true about each. */
export interface KeyPair {
  kind: string;
  run1: { answer: Answer; truth: Truth };
  run2: { answer: Answer; truth: Truth };
}

export type Outcome =
  /** Run 1 is not a confident false or true positive, so no record starts. */
  | 'no_record'
  /** Both runs give the same verdict at the floor: the record becomes active. */
  | 'activates'
  /** Both runs are confident, with different verdicts: the key becomes unstable. */
  | 'verdicts_differ'
  /** Run 1 is confident and run 2 is inconclusive or under the floor: the key becomes unstable. */
  | 'run2_not_confident';

export const outcomeOf = (
  { run1, run2 }: Pick<KeyPair, 'run1' | 'run2'>,
  floor = FLOOR
): Outcome => {
  const first = toCacheVerdict(
    {
      alertId: '',
      classification: run1.answer.classification,
      confidenceScore: run1.answer.confidence,
    },
    floor
  );
  if (first === undefined) return 'no_record';
  const second = toCacheVerdict(
    {
      alertId: '',
      classification: run2.answer.classification,
      confidenceScore: run2.answer.confidence,
    },
    floor
  );
  if (second === undefined) return 'run2_not_confident';
  return second === first ? 'activates' : 'verdicts_differ';
};

export type Cause = 'coarse_key' | 'model_noise' | 'confidence_gate';

/** Why a key became unstable. `undefined` for a key that did not. */
export const causeOf = (pair: KeyPair, floor = FLOOR): Cause | undefined => {
  const outcome = outcomeOf(pair, floor);
  if (outcome === 'no_record' || outcome === 'activates') return undefined;
  if (pair.run1.truth !== pair.run2.truth) return 'coarse_key';
  return outcome === 'run2_not_confident' ? 'confidence_gate' : 'model_noise';
};

interface Counts {
  /** Keys that had two alerts with an answer. */
  pairs: number;
  noRecord: number;
  /** Keys with a record after run 1: `pairs` minus `noRecord`. */
  withRecord: number;
  activates: number;
  unstable: number;
  unstableShare: number | null;
  causes: Record<Cause, number>;
  /** Active records whose two alerts have a different truth: the record covers a mixed key. */
  activatesOnMixedKey: number;
  /** Active records of a false positive whose second alert is a true positive (a bad variant that the model missed). */
  activatesFalsePositiveOnTruePositive: number;
}

export interface DisagreementReport {
  floor: number;
  overall: Counts;
  byKind: Record<string, Counts>;
}

const emptyCounts = (): Counts => ({
  pairs: 0,
  noRecord: 0,
  withRecord: 0,
  activates: 0,
  unstable: 0,
  unstableShare: null,
  causes: { coarse_key: 0, model_noise: 0, confidence_gate: 0 },
  activatesOnMixedKey: 0,
  activatesFalsePositiveOnTruePositive: 0,
});

/** Pure: the report of a set of pairs. */
export const summarizePairs = (pairs: readonly KeyPair[], floor = FLOOR): DisagreementReport => {
  const overall = emptyCounts();
  const byKind: Record<string, Counts> = {};
  for (const pair of pairs) {
    const kindCounts = (byKind[pair.kind] = byKind[pair.kind] ?? emptyCounts());
    const outcome = outcomeOf(pair, floor);
    const cause = causeOf(pair, floor);
    for (const counts of [overall, kindCounts]) {
      counts.pairs++;
      if (outcome === 'no_record') {
        counts.noRecord++;
        continue;
      }
      counts.withRecord++;
      if (outcome === 'activates') {
        counts.activates++;
        if (pair.run1.truth !== pair.run2.truth) {
          counts.activatesOnMixedKey++;
          if (pair.run1.truth === 'false_positive') counts.activatesFalsePositiveOnTruePositive++;
        }
      } else {
        counts.unstable++;
        if (cause !== undefined) counts.causes[cause]++;
      }
    }
  }
  for (const counts of [overall, ...Object.values(byKind)]) {
    counts.unstableShare =
      counts.withRecord === 0 ? null : Number((counts.unstable / counts.withRecord).toFixed(4));
  }
  return { floor, overall, byKind };
};

// ---------------------------------------------------------------------------------------------
// The pairs of a calibration run: the first two alerts of each key, in the order of the cache
// ---------------------------------------------------------------------------------------------

export interface RunAlert {
  id: string;
  /** The strict key of the alert, or `undefined` for an alert without one. */
  strictKey: string | undefined;
  riskScore: number;
  timestamp: number;
  truth: Truth;
}

/**
 * The first two alerts of each key that has an answer, in the order of the cache: risk score high first, then the oldest alert,
 * then the lowest id. Run 1 is the first of them, run 2 the next. A key with a single alert has no pair.
 */
export const pairsFromRun = (
  alerts: readonly RunAlert[],
  answers: ReadonlyMap<string, Answer>
): KeyPair[] => {
  const byKey = new Map<string, RunAlert[]>();
  for (const alert of alerts) {
    if (alert.strictKey === undefined || !answers.has(alert.id)) continue;
    byKey.set(alert.strictKey, [...(byKey.get(alert.strictKey) ?? []), alert]);
  }
  return [...byKey.entries()].flatMap(([strictKey, group]) => {
    if (group.length < 2) return [];
    const [first, second] = [...group].sort(
      (a, b) => b.riskScore - a.riskScore || a.timestamp - b.timestamp || a.id.localeCompare(b.id)
    );
    return [
      {
        kind: describePatternKey(strictKey).kind,
        run1: { answer: answers.get(first.id) as Answer, truth: first.truth },
        run2: { answer: answers.get(second.id) as Answer, truth: second.truth },
      },
    ];
  });
};

// ---------------------------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------------------------

interface VerdictHit {
  _source: {
    output?: {
      content?: {
        verdicts?: Array<{
          id?: string;
          alert_id?: string;
          classification: string;
          confidence_score?: number;
        }>;
      };
    };
  };
}

/** The verdicts of the analysis steps of a time window, with their confidence. */
export const readAnswers = async (
  request: EsRequest,
  { from, to }: { from: string; to: string }
): Promise<Map<string, Answer>> => {
  const page = await request<{ hits: { hits: VerdictHit[] } }>(
    'POST',
    '/.workflows-step-executions/_search',
    {
      size: 1000,
      query: {
        bool: {
          filter: [
            { term: { stepType: 'ai.prompt' } },
            { term: { workflowId: 'system-security-alert-analysis' } },
            { range: { startedAt: { gte: from, lte: to } } },
          ],
        },
      },
      _source: ['output.content.verdicts'],
    }
  );
  const answers = new Map<string, Answer>();
  for (const { _source } of page.hits.hits) {
    for (const verdict of _source.output?.content?.verdicts ?? []) {
      const id = verdict.id ?? verdict.alert_id;
      if (id !== undefined) {
        answers.set(id, {
          classification: verdict.classification,
          confidence: verdict.confidence_score ?? 0,
        });
      }
    }
  }
  return answers;
};

const readLines = async (file: string): Promise<string[]> => {
  const lines: string[] = [];
  const reader = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });
  for await (const line of reader) if (line) lines.push(line);
  return lines;
};

/** The alerts of a sample or a generated day with their strict key and truth. */
export const readRunAlerts = async (folder: string): Promise<RunAlert[]> => {
  const truthById = new Map<string, Truth>();
  for (const line of await readLines(path.join(folder, 'truth.ndjson'))) {
    const { id, verdict } = JSON.parse(line) as { id: string; verdict: Truth };
    truthById.set(id, verdict);
  }
  const alerts: RunAlert[] = [];
  for (const line of await readLines(path.join(folder, 'alerts.ndjson'))) {
    const { _id, _source } = JSON.parse(line) as { _id: string; _source: Record<string, unknown> };
    const truth = truthById.get(_id);
    if (truth === undefined) throw new Error(`alert ${_id} has no truth record`);
    alerts.push({
      id: _id,
      strictKey: buildPatternKeys(_source).strict,
      riskScore: Number(getField(_source, 'kibana.alert.risk_score') ?? 0) || 0,
      timestamp: Date.parse(String(getField(_source, '@timestamp') ?? '')) || 0,
      truth,
    });
  }
  return alerts;
};

/**
 * The pairs that the shadow run of the cache left as records: every record that got a second run. Run 1 and run 2 are the
 * answers that the record holds, and the truth comes from the file of the generated day.
 */
export const pairsFromRecords = async (
  request: EsRequest,
  window: { from: string; to: string },
  dayFolder: string
): Promise<KeyPair[]> => {
  const truthById = new Map<string, Truth>();
  for (const line of await readLines(path.join(dayFolder, 'truth.ndjson'))) {
    const { id, verdict } = JSON.parse(line) as { id: string; verdict: Truth };
    truthById.set(id, verdict);
  }
  const { records } = await readCacheData(request, window);
  return records.flatMap((record) => {
    const { run1, run2 } = record;
    const truth1 = truthById.get(run1.alertId);
    const truth2 = run2 === undefined ? undefined : truthById.get(run2.alertId);
    if (run2 === undefined || truth1 === undefined || truth2 === undefined) return [];
    return [
      {
        kind: describePatternKey(record.strictKey).kind,
        run1: {
          answer: { classification: run1.verdict, confidence: run1.confidence },
          truth: truth1,
        },
        run2: {
          answer: { classification: run2.verdict, confidence: run2.confidence },
          truth: truth2,
        },
      },
    ];
  });
};

type ValueFlagKey = 'out' | 'haikuWindow' | 'data' | 'records' | 'from' | 'to' | 'es';

export const main = async (): Promise<void> => {
  const flags: Readonly<Record<string, ValueFlagKey>> = {
    '--out': 'out',
    '--haiku-window': 'haikuWindow',
    '--data': 'data',
    '--records': 'records',
    '--from': 'from',
    '--to': 'to',
    '--es': 'es',
  };
  const args: Partial<Record<ValueFlagKey, string>> = { es: 'http://localhost:9200' };
  for (let i = 2; i < process.argv.length; i++) {
    const key = flags[process.argv[i]];
    if (!key) throw new Error(`unknown argument ${process.argv[i]}`);
    args[key] = process.argv[++i];
  }
  const { out, haikuWindow, data, records, from, to } = args;
  if (!out) throw new Error('--out <report.json> is required');
  const request = makeClient(args.es ?? 'http://localhost:9200');

  let pairs: KeyPair[];
  if (haikuWindow !== undefined) {
    if (!data) throw new Error('--data <sample folder> is required with --haiku-window');
    const [windowFrom, windowTo] = haikuWindow.split(',');
    const answers = await readAnswers(request, { from: windowFrom, to: windowTo });
    pairs = pairsFromRun(await readRunAlerts(data), answers);
  } else if (records !== undefined) {
    if (!from || !to) throw new Error('--from and --to are required with --records');
    pairs = await pairsFromRecords(request, { from, to }, records);
  } else {
    throw new Error('give --haiku-window with --data, or --records with --from and --to');
  }
  const report = summarizePairs(pairs);
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  const { overall } = report;
  process.stdout.write(
    `${overall.pairs} keys with two answers, ${overall.withRecord} with a record: ${overall.activates} active, ${overall.unstable} unstable ` +
      `(${JSON.stringify(overall.causes)}), ${
        overall.activatesOnMixedKey
      } active on a mixed key. Report written to ${out}\n`
  );
};
