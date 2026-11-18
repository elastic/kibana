/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fits the rule model of the fake LLM (`ruleModel`, `confidenceByKind`, see `fake_llm.ts`) from SEVERAL real runs on the same
 * alerts. One run cannot show it: a rule that flips as a whole looks like a rule that the model always reads wrongly. It
 * reads the raw model answers of each window (as `calibrate_fake_llm.ts` does), joins them to the truth and reports:
 *
 * - per rule and run: the share of its true positives (planted variants left out) that got a false-positive verdict. A rule is
 *   "flipped" in a run when that share is at least 0.5
 * - the rules that are flipped in some runs and not in others are the unstable ones. `unstableRuleShare` is their share of the
 *   rules that have true positives, `unstableFlipChance` the share of the runs in which they flipped. Both come with the number
 *   of rules and runs behind them: with a handful of rules this is a rough estimate, and it says so
 * - the per-alert flip rates and the miss rate per variant type, with the alerts of flipped rules left out of the flip rate
 *   (those belong to the rule model)
 * - the confidence of right and of wrong answers per kind of alert (a table of quantiles when at least 20 answers are behind it)
 *
 * The result is a `proposedConfig` that is the `--base-config` (the settings of an earlier calibration, which carry the latency
 * and the tokens) with these parts replaced.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/fit_rule_model_cli.js --id <name> \
 *     --runs '<from>,<to>;<from>,<to>;...' --data <folder with truth.ndjson> --es http://localhost:9200 \
 *     --expect-cluster elasticsearch --connector-id <the real connector> --base-config <config json> [--notes-dir <dir>]
 */

import fs from 'fs';
import path from 'path';
import type { ConfidenceDistribution, FakeLlmConfig, KindConfidence, RuleModel } from './fake_llm';
import { DEFAULT_CONFIG } from './fake_llm';
import type { AnswerRow, FittedDistribution, Share } from './calibrate_fake_llm';
import { share, joinAnswers, fitDistribution } from './calibrate_fake_llm';
import { makeClient, loadTruth, readRun } from './report_run';

/** An answer row as the rule model reads it: the id of the alert is not needed. */
export type FitRow = Omit<AnswerRow, 'id'>;

/** Per rule and run: how many true positives were settled, and how many of them got a false-positive verdict. */
export interface RuleOutcome {
  ruleUuid: string | undefined;
  kind?: string;
  perRun: Array<{ run: string; settled: number; calledFalsePositive: number; flipped: boolean }>;
  flips: number;
  runs: number;
  unstable: boolean;
}

export interface RuleModelFit {
  comparableRules: number;
  unstableRules: Array<string | undefined>;
  alwaysFlippedRules: Array<string | undefined>;
  ruleModel: RuleModel;
}

export interface RunsFit extends Omit<RuleModelFit, 'ruleModel'> {
  runs: string[];
  outcomes: RuleOutcome[];
  flipRate: { falsePositiveAsTruePositive: Share; truePositiveAsFalsePositive: Share };
  variants: Record<string, Share>;
  confidenceCounts: Record<string, { correct: number; wrong: number }>;
  flippedBatchConfidence: FittedDistribution;
  proposedConfig: FakeLlmConfig;
}

/** The settings to start from. An old settings file can carry a confidence shape that the fake cannot sample. */
export type BaseConfig = Omit<FakeLlmConfig, 'confidence'> & {
  confidence: Omit<FakeLlmConfig['confidence'], 'inconclusive'> & {
    inconclusive: ConfidenceDistribution | readonly number[];
  };
};

const isNumberList = (d: ConfidenceDistribution | readonly number[]): d is readonly number[] =>
  Array.isArray(d);

const isDistribution = (
  d: ConfidenceDistribution | readonly number[] | null | undefined
): d is ConfidenceDistribution =>
  Boolean(d && !isNumberList(d) && (d.quantiles || Number.isFinite(d.mean)));
const FLIPPED_SHARE = 0.5;
const MIN_FOR_KIND = 20;

/** Per rule and run: the true positives without planted variants, and how many of them got a false-positive verdict. */
export const ruleOutcomes = (rowsByRun: ReadonlyMap<string, readonly FitRow[]>): RuleOutcome[] => {
  const rules = new Map<
    string | undefined,
    { kind?: string; runs: Map<string, { settled: number; calledFalsePositive: number }> }
  >();
  rowsByRun.forEach((rows, run) => {
    rows
      .filter((row) => row.truth === 'tp' && !row.variant && row.answer !== 'inc')
      .forEach((row) => {
        const entry = rules.get(row.ruleUuid) ?? { kind: row.kind, runs: new Map() };
        const stats = entry.runs.get(run) ?? { settled: 0, calledFalsePositive: 0 };
        stats.settled++;
        if (row.answer === 'fp') stats.calledFalsePositive++;
        entry.runs.set(run, stats);
        rules.set(row.ruleUuid, entry);
      });
  });
  return [...rules.entries()].map(([ruleUuid, { kind, runs }]) => {
    const perRun = [...runs.entries()].map(([run, s]) => ({
      run,
      settled: s.settled,
      calledFalsePositive: s.calledFalsePositive,
      flipped: s.calledFalsePositive / s.settled >= FLIPPED_SHARE,
    }));
    const flips = perRun.filter((r) => r.flipped).length;
    return {
      ruleUuid,
      kind,
      perRun,
      flips,
      runs: perRun.length,
      unstable: flips > 0 && flips < perRun.length,
    };
  });
};

/** The rule model from the outcomes. Only rules seen in at least two runs can tell whether they are stable. */
export const fitRuleModel = (outcomes: readonly RuleOutcome[]): RuleModelFit => {
  const comparable = outcomes.filter((rule) => rule.runs >= 2);
  const unstable = comparable.filter((rule) => rule.unstable);
  const flipsOfUnstable = unstable.reduce((sum, rule) => sum + rule.flips, 0);
  const runsOfUnstable = unstable.reduce((sum, rule) => sum + rule.runs, 0);
  return {
    comparableRules: comparable.length,
    unstableRules: unstable.map((rule) => rule.ruleUuid),
    // Rules flipped in every run they were seen in are not unstable: they are a fixed misreading, and show as a flip rate.
    alwaysFlippedRules: comparable
      .filter((rule) => rule.flips === rule.runs)
      .map((rule) => rule.ruleUuid),
    ruleModel: {
      unstableRuleShare: comparable.length
        ? Number((unstable.length / comparable.length).toFixed(4))
        : 0,
      unstableFlipChance: runsOfUnstable
        ? Number((flipsOfUnstable / runsOfUnstable).toFixed(3))
        : 0,
    },
  };
};

const keep = <T>(value: T | null | undefined, fallback: T): T =>
  value === null || value === undefined ? fallback : value;

/**
 * @param rowsByRun  Map of run label to `joinAnswers` rows
 * @param previous   the config to start from
 */
export const fitFromRuns = ({
  rowsByRun,
  previous,
}: {
  rowsByRun: ReadonlyMap<string, readonly FitRow[]>;
  previous: BaseConfig;
}): RunsFit => {
  const outcomes = ruleOutcomes(rowsByRun);
  const { ruleModel, comparableRules, unstableRules, alwaysFlippedRules } = fitRuleModel(outcomes);
  const unstableSet = new Set(unstableRules);
  // The alerts of unstable rules are the rule model's: leave them out of every per-alert rate and distribution.
  const rows = [...rowsByRun.values()]
    .flat()
    .filter((row) => !unstableSet.has(row.ruleUuid) && row.answer !== 'inc');
  const plain = rows.filter((row) => !row.variant);
  const settled = (verdict: string): FitRow[] => plain.filter((row) => row.truth === verdict);
  const count = (list: readonly FitRow[], answer: string): number =>
    list.filter((row) => row.answer === answer).length;

  const variants: Record<string, { settled: number; missed: number }> = {};
  [...rowsByRun.values()].flat().forEach((row) => {
    if (!row.variant || row.answer === 'inc') return;
    const entry = (variants[row.variant] = variants[row.variant] ?? { settled: 0, missed: 0 });
    entry.settled++;
    if (row.answer === 'fp') entry.missed++;
  });

  const kinds = [...new Set(plain.map((row) => row.kind))].sort();
  const confidenceByKind: Record<string, KindConfidence> = {};
  const confidenceFit: Record<string, { correct: number; wrong: number }> = {};
  kinds.forEach((kind) => {
    const ofKind = plain.filter((row) => row.kind === kind);
    const correct = fitDistribution(
      ofKind.filter((row) => row.answer === row.truth).map((row) => row.confidence)
    );
    const wrong = fitDistribution(
      ofKind.filter((row) => row.answer !== row.truth).map((row) => row.confidence)
    );
    // An alert without a kind lands under the key "undefined", as an object key made from `undefined` does.
    const kindKey = String(kind);
    confidenceFit[kindKey] = { correct: correct.count, wrong: wrong.count };
    const entry: KindConfidence = {};
    if (correct.count >= MIN_FOR_KIND && correct.distribution) entry.correct = correct.distribution;
    if (wrong.count >= MIN_FOR_KIND && wrong.distribution) entry.wrong = wrong.distribution;
    if (Object.keys(entry).length) confidenceByKind[kindKey] = entry;
  });
  // Wrong answers inside unstable rules show how confident a flipped batch is: the best data for the "wrong" distribution.
  const flipped = [...rowsByRun.values()]
    .flat()
    .filter(
      (row) =>
        unstableSet.has(row.ruleUuid) && row.truth === 'tp' && row.answer === 'fp' && !row.variant
    );
  const flippedConfidence = fitDistribution(flipped.map((row) => row.confidence));

  // A variant that shows no sign in the alert is missed with the confidence of a right answer (see `invisibleVariants`): not here.
  const invisible = previous.invisibleVariants ?? DEFAULT_CONFIG.invisibleVariants;
  const visibleMisses = [...rowsByRun.values()]
    .flat()
    .filter(
      (row) =>
        row.variant &&
        !invisible.includes(row.variant) &&
        row.answer !== 'inc' &&
        row.answer !== row.truth
    );
  const pooledWrong = fitDistribution(
    [...plain.filter((row) => row.answer !== row.truth), ...flipped, ...visibleMisses].map(
      (row) => row.confidence
    )
  );
  const pooledRight = fitDistribution(
    plain.filter((row) => row.answer === row.truth).map((row) => row.confidence)
  );

  const flipRate = {
    falsePositiveAsTruePositive: share(count(settled('fp'), 'tp'), settled('fp').length),
    truePositiveAsFalsePositive: share(count(settled('tp'), 'fp'), settled('tp').length),
  };
  const proposedConfig: FakeLlmConfig = {
    ...previous,
    flipRate: {
      falsePositiveAsTruePositive: keep(
        flipRate.falsePositiveAsTruePositive.value,
        previous.flipRate.falsePositiveAsTruePositive
      ),
      truePositiveAsFalsePositive: keep(
        flipRate.truePositiveAsFalsePositive.value,
        previous.flipRate.truePositiveAsFalsePositive
      ),
    },
    inconclusiveRate: 0,
    variantMissRate: Object.fromEntries(
      Object.entries(variants).map(([type, v]) => [type, Number((v.missed / v.settled).toFixed(3))])
    ),
    ruleModel,
    confidenceByKind,
    confidence: {
      ...previous.confidence,
      correct: keep(pooledRight.distribution, previous.confidence.correct),
      wrong: keep(pooledWrong.distribution, previous.confidence.wrong),
      // An old settings file can carry a shape that the fake cannot sample: take the default then.
      inconclusive: isDistribution(previous.confidence.inconclusive)
        ? previous.confidence.inconclusive
        : DEFAULT_CONFIG.confidence.inconclusive,
    },
  };
  return {
    runs: [...rowsByRun.keys()],
    comparableRules,
    outcomes,
    unstableRules,
    alwaysFlippedRules,
    flipRate,
    variants: Object.fromEntries(
      Object.entries(variants).map(([type, v]) => [type, share(v.missed, v.settled)])
    ),
    confidenceCounts: confidenceFit,
    flippedBatchConfidence: flippedConfidence,
    proposedConfig,
  };
};

interface FitRuleModelArgs {
  id: string;
  runs: string;
  data: string;
  es: string;
  expectCluster: string;
  connectorId: string;
  baseConfig: string;
  notesDir: string;
  alertIndex: string;
}

const FLAGS: Readonly<Record<string, keyof FitRuleModelArgs>> = {
  '--id': 'id',
  '--runs': 'runs',
  '--data': 'data',
  '--es': 'es',
  '--expect-cluster': 'expectCluster',
  '--connector-id': 'connectorId',
  '--base-config': 'baseConfig',
  '--notes-dir': 'notesDir',
  '--alert-index': 'alertIndex',
};

const REQUIRED_ARGS = [
  'id',
  'runs',
  'data',
  'es',
  'expectCluster',
  'connectorId',
  'baseConfig',
] as const;

export const main = async (): Promise<void> => {
  const partial: Partial<FitRuleModelArgs> = {
    alertIndex: '.alerts-security.alerts-default',
    notesDir: path.resolve(__dirname, '../../../../../../../../notes'),
  };
  for (let i = 2; i < process.argv.length; i++) {
    const key = FLAGS[process.argv[i]];
    if (!key) throw new Error(`unknown argument ${process.argv[i]}`);
    partial[key] = process.argv[++i];
  }
  REQUIRED_ARGS.forEach((name) => {
    if (!partial[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  const args = partial as FitRuleModelArgs;
  const windows = args.runs.split(';').map((pair) => pair.split(','));
  if (windows.length < 2 || windows.some((w) => w.length !== 2))
    throw new Error('--runs needs at least two windows "<from>,<to>" separated by ;');
  const request = makeClient(args.es);
  const { cluster_name: cluster } = await request<{ cluster_name: string }>('GET', '/');
  if (cluster !== args.expectCluster)
    throw new Error(`refusing to run: cluster is "${cluster}", expected "${args.expectCluster}"`);
  const truth = await loadTruth(path.join(args.data, 'truth.ndjson'));
  const rowsByRun = new Map<string, FitRow[]>();
  for (const [from, to] of windows) {
    const run = await readRun(request, { from, to, alertIndex: args.alertIndex });
    const connectors = [
      ...new Set(
        run.calls.map((call) => call.connectorId).filter((id): id is string => Boolean(id))
      ),
    ];
    if (connectors.length !== 1 || connectors[0] !== args.connectorId)
      throw new Error(
        `the calls of ${from} used ${JSON.stringify(connectors)}, expected only ${args.connectorId}`
      );
    rowsByRun.set(from, joinAnswers(run.calls, truth));
  }
  const previous = JSON.parse(fs.readFileSync(args.baseConfig, 'utf8')) as BaseConfig;
  const result = fitFromRuns({ rowsByRun, previous });
  const reportFile = path.join(args.notesDir, 'runs', `${args.id}_rule_model.json`);
  const configFile = path.join(args.notesDir, 'runs', `${args.id}_fake_config.json`);
  [reportFile, configFile].forEach((file) => {
    if (fs.existsSync(file)) throw new Error(`${file} exists: reports are never overwritten`);
  });
  fs.writeFileSync(reportFile, JSON.stringify({ id: args.id, windows, ...result }, null, 2));
  fs.writeFileSync(configFile, JSON.stringify(result.proposedConfig));
  process.stdout.write(`${JSON.stringify({ reportFile, configFile, ...result }, null, 2)}\n`);
};
