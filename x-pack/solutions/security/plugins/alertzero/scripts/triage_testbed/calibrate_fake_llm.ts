/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fits the settings of the fake LLM (`fake_llm.ts`) to a REAL run. It reads the model calls
 * of the run (the raw answers of the model, not the tags that the workflow wrote: the workflow turns a
 * false-positive verdict under the confidence gate into `inconclusive`, which would bias the fit) and joins them to
 * the truth file.
 *
 * It fits, and reports with the number of observations behind each value:
 * - the two directions of wrong verdicts (`flipRate`), the inconclusive rate and the miss rate per variant type
 * - the confidence distribution of right answers, of wrong answers and of inconclusive answers, as a table of
 *   quantiles (or `{ mean, halfWidth }` when fewer than 20 answers are behind it)
 * - the latency (`baseMs`, `perAlertMs`, `sigma`) by a straight-line fit of the call time against the alerts per call
 * - the tokens: characters per token of the prompt, and completion tokens per alert
 * It also reports the gap between the share of true-positive verdicts of the model and the share of true positives in
 * the truth, so that a biased sample can be told from a model that finds too few attacks.
 *
 * The output is a `proposedConfig` that `fake_llm_cli.js --config` takes, next to the `previousConfig`, so that the ledger can
 * record the old and the new settings. Rerun the fake baseline with the new settings after that.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/calibrate_fake_llm_cli.js \
 *     --run-id <id> --from <ISO time> --to <ISO time> --data <folder with truth.ndjson> --es http://localhost:9200 \
 *     --expect-cluster elasticsearch --connector-id <the real connector> [--previous-config <fake_llm.log>] --notes-dir <the results folder with ledger.md and runs/>
 *   Needs a run on a REAL connector. A run on the fake connector is refused.
 */

import fs from 'fs';
import path from 'path';
import type { ConfidenceDistribution, FakeLlmConfig, Truth } from './fake_llm';
import { DEFAULT_CONFIG, parseAlertIds } from './fake_llm';
import type { ModelCall, ShortVerdict } from './report_run';
import {
  percentile,
  mean,
  makeClient,
  loadTruth,
  readRun,
  resolveExcludedRules,
} from './report_run';

const QUANTILE_POINTS = 11; // 0, 0.1, ... 1
const MIN_FOR_QUANTILES = 20;
const SHORT: Readonly<Partial<Record<string, ShortVerdict>>> = {
  false_positive: 'fp',
  true_positive: 'tp',
  inconclusive: 'inc',
};

/** The parts of a model call that the fits read. */
export type FitCall = Pick<
  ModelCall,
  'status' | 'verdicts' | 'executionTimeMs' | 'prompt' | 'inputTokens' | 'outputTokens'
>;

/** A share with its count, its total and the Wilson interval. */
export interface Share {
  value: number | null;
  count: number;
  of: number;
  low: number | null;
  high: number | null;
}

/** The raw answer of the model for one alert, joined to the truth. */
export interface AnswerRow {
  id: string;
  truth: string;
  variant?: string | null;
  benign?: string | null;
  kind?: string;
  ruleUuid?: string;
  answer: ShortVerdict | undefined;
  confidence: number;
}

export interface VerdictFit {
  flipRate: { falsePositiveAsTruePositive: Share; truePositiveAsFalsePositive: Share };
  inconclusiveRate: Share;
  variantMissRate: Record<string, Share>;
}

export interface FittedDistribution {
  distribution: ConfidenceDistribution | null;
  count: number;
  lowSample?: boolean;
  mean?: number | null;
}

export interface ConfidenceFit {
  correct: FittedDistribution;
  wrong: FittedDistribution;
  inconclusive: FittedDistribution;
}

export interface LatencyFit {
  baseMs: number;
  perAlertMs: number;
  sigma: number;
  calls: number;
}

export interface TokenFit {
  charsPerToken: number;
  completionPerAlert: number;
  promptTokensPerAlert: number;
  calls: number;
}

export interface TruePositiveGap {
  analyzed: number;
  modelTruePositiveVerdicts: Share;
  truePositivesInTheAnalyzedAlerts: Share;
  truePositivesInTheWholeTruth: Share;
  gapModelToSample: number;
  gapSampleToWholeTruth: number;
}

export interface ContentAgreement {
  byKindAndTruth: Record<
    string,
    {
      n: number;
      right: number;
      opposite: number;
      inconclusive: number;
      rightShare: number | null;
      oppositeShare: number | null;
    }
  >;
  plantedVariants: Record<
    string,
    { n: number; foundAsTruePositive: number; foundShare: number | null }
  >;
  harmlessChanges: { n: number; takenForTruePositive: number };
}

/** The settings of the fake LLM that follow from the fit. */
export interface ProposedConfig {
  flipRate: FakeLlmConfig['flipRate'];
  inconclusiveRate: number;
  variantMissRate: Record<string, number>;
  confidence: FakeLlmConfig['confidence'];
  latency: FakeLlmConfig['latency'];
  tokens: FakeLlmConfig['tokens'];
}

export interface Calibration {
  answers: number;
  answersInTheFit: number;
  excludedRules: Record<string, { answers: number; truthToAnswer: Record<string, number> }>;
  verdicts: VerdictFit;
  confidence: ConfidenceFit;
  latency: LatencyFit | null;
  tokens: TokenFit | null;
  truePositiveGap: TruePositiveGap | null;
  contentAgreement: ContentAgreement;
  proposedConfig: ProposedConfig;
}

const roundNumber = (value: number, digits: number = 4): number => Number(value.toFixed(digits));
const round = (value: number | null | undefined, digits: number = 4): number | null =>
  value === null || value === undefined ? null : roundNumber(value, digits);
// The mean of a list that is never empty where it is used.
const average = (values: readonly number[]): number => mean(values) ?? 0;
const sd = (values: readonly number[]): number => {
  if (values.length < 2) return 0;
  const m = average(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
};

/** Wilson 95% interval of a share, because the counts are small. */
export const wilson = (
  successes: number,
  total: number
): { low: number | null; high: number | null } => {
  if (total === 0) return { low: null, high: null };
  const z = 1.96;
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator;
  return {
    low: roundNumber(Math.max(0, centre - half)),
    high: roundNumber(Math.min(1, centre + half)),
  };
};

export const share = (successes: number, total: number): Share => ({
  value: total ? roundNumber(successes / total) : null,
  count: successes,
  of: total,
  ...wilson(successes, total),
});

/** The raw answers of the model joined to the truth: `{ id, truth, variant, benign, answer, confidence }`. */
export const joinAnswers = (
  calls: ReadonlyArray<Pick<ModelCall, 'status' | 'verdicts'>>,
  truth: Truth
): AnswerRow[] => {
  const rows: AnswerRow[] = [];
  calls
    .filter((call) => call.status === 'completed')
    .forEach((call) => {
      (call.verdicts ?? []).forEach(({ id, classification, confidence_score: confidence }) => {
        const known = truth.get(id);
        if (!known) return;
        rows.push({
          id,
          truth: SHORT[known.verdict] ?? known.verdict,
          variant: known.variant,
          benign: known.benign,
          kind: known.kind,
          ruleUuid: known.ruleUuid,
          answer: SHORT[classification],
          confidence,
        });
      });
    });
  return rows;
};

/** Wrong verdicts by direction (planted variants apart), the inconclusive rate and the miss rate per variant type. */
export const fitVerdicts = (rows: readonly AnswerRow[]): VerdictFit => {
  const plain = rows.filter((row) => !row.variant);
  const settled = (truthVerdict: string): AnswerRow[] =>
    plain.filter((row) => row.truth === truthVerdict && row.answer !== 'inc');
  const fpSettled = settled('fp');
  const tpSettled = settled('tp');
  const variants: Record<string, { settled: number; missed: number }> = {};
  rows.forEach((row) => {
    if (!row.variant) return;
    const entry = (variants[row.variant] = variants[row.variant] ?? { settled: 0, missed: 0 });
    if (row.answer === 'inc') return;
    entry.settled++;
    if (row.answer === 'fp') entry.missed++;
  });
  return {
    flipRate: {
      falsePositiveAsTruePositive: share(
        fpSettled.filter((row) => row.answer === 'tp').length,
        fpSettled.length
      ),
      truePositiveAsFalsePositive: share(
        tpSettled.filter((row) => row.answer === 'fp').length,
        tpSettled.length
      ),
    },
    inconclusiveRate: share(rows.filter((row) => row.answer === 'inc').length, rows.length),
    variantMissRate: Object.fromEntries(
      Object.entries(variants).map(([type, v]) => [type, share(v.missed, v.settled)])
    ),
  };
};

/** A distribution of confidences: a table of quantiles, or `{ mean, halfWidth }` when there are too few answers. */
export const fitDistribution = (scores: readonly number[]): FittedDistribution => {
  if (scores.length === 0) return { distribution: null, count: 0 };
  if (scores.length < MIN_FOR_QUANTILES) {
    const m = average(scores);
    const halfWidth = Math.max(sd(scores) * 1.7, 0.05);
    return {
      distribution: {
        mean: roundNumber(m),
        halfWidth: roundNumber(Math.min(halfWidth, m, 1 - m)),
      },
      count: scores.length,
      lowSample: true,
    };
  }
  const quantiles = Array.from({ length: QUANTILE_POINTS }, (_, i) => {
    const q = i / (QUANTILE_POINTS - 1);
    return roundNumber(q === 0 ? Math.min(...scores) : percentile(scores, q) ?? 0, 3);
  });
  return { distribution: { quantiles }, count: scores.length, mean: round(mean(scores)) };
};

export const fitConfidence = (rows: readonly AnswerRow[]): ConfidenceFit => {
  const right = rows
    .filter((row) => row.answer !== 'inc' && row.answer === row.truth && !row.variant)
    .map((row) => row.confidence);
  const wrong = rows
    .filter((row) => row.answer !== 'inc' && row.answer !== row.truth && !row.variant)
    .map((row) => row.confidence);
  const inconclusive = rows.filter((row) => row.answer === 'inc').map((row) => row.confidence);
  return {
    correct: fitDistribution(right),
    wrong: fitDistribution(wrong),
    inconclusive: fitDistribution(inconclusive),
  };
};

/** A straight-line fit of the call time against the alerts per call, and the spread of the rest. */
export const fitLatency = (calls: readonly FitCall[]): LatencyFit | null => {
  const points = calls
    .filter((call) => call.status === 'completed' && Number.isFinite(call.executionTimeMs))
    .map((call) => ({ n: parseAlertIds(call.prompt).length, ms: call.executionTimeMs ?? 0 }))
    .filter((point) => point.n > 0);
  if (points.length === 0) return null;
  const meanN = average(points.map((p) => p.n));
  const meanMs = average(points.map((p) => p.ms));
  const varianceN = points.reduce((sum, p) => sum + (p.n - meanN) ** 2, 0);
  let perAlertMs: number;
  let baseMs: number;
  if (varianceN === 0) {
    // One batch size only: no base can be told from the part per alert.
    perAlertMs = meanMs / meanN;
    baseMs = 0;
  } else {
    perAlertMs = points.reduce((sum, p) => sum + (p.n - meanN) * (p.ms - meanMs), 0) / varianceN;
    baseMs = meanMs - perAlertMs * meanN;
    if (baseMs < 0 || perAlertMs < 0) {
      // A negative part has no meaning for a call time: fall back to time proportional to the alerts.
      baseMs = 0;
      perAlertMs = average(points.map((p) => p.ms / p.n));
    }
  }
  const ratios = points.map((p) => Math.log(p.ms / Math.max(baseMs + perAlertMs * p.n, 1)));
  return {
    baseMs: Math.round(baseMs),
    perAlertMs: Math.round(perAlertMs),
    sigma: roundNumber(sd(ratios), 3),
    calls: points.length,
  };
};

export const fitTokens = (calls: readonly FitCall[]): TokenFit | null => {
  const completed = calls.filter((call) => call.status === 'completed' && call.inputTokens);
  if (completed.length === 0) return null;
  const chars = completed.reduce((sum, call) => sum + call.prompt.length, 0);
  const inputTokens = completed.reduce((sum, call) => sum + (call.inputTokens ?? 0), 0);
  const alerts = completed.reduce((sum, call) => sum + parseAlertIds(call.prompt).length, 0);
  const outputTokens = completed.reduce((sum, call) => sum + (call.outputTokens ?? 0), 0);
  return {
    // The prompt of the step is only a part of what the model reads (the system message adds to it), so this is an upper bound of the characters per token.
    charsPerToken: roundNumber(chars / inputTokens, 2),
    completionPerAlert: roundNumber(outputTokens / alerts, 1),
    promptTokensPerAlert: roundNumber(inputTokens / alerts, 1),
    calls: completed.length,
  };
};

/**
 * The share of true-positive verdicts of the model against the share of true positives in the truth: of the alerts
 * that the run analyzed, and of the whole generated day. A run does not take a random sample (the sweep takes the
 * rules in the order of its plan), so the share in the sample can differ from the share in the day.
 */
export const truePositiveGap = (rows: readonly AnswerRow[], truth: Truth): TruePositiveGap => {
  const truePositivesInTruth = [...truth.values()].filter(
    (t) => t.verdict === 'true_positive'
  ).length;
  const modelTruePositive = rows.filter((row) => row.answer === 'tp').length;
  const sampleTruePositive = rows.filter((row) => row.truth === 'tp').length;
  return {
    analyzed: rows.length,
    modelTruePositiveVerdicts: share(modelTruePositive, rows.length),
    truePositivesInTheAnalyzedAlerts: share(sampleTruePositive, rows.length),
    truePositivesInTheWholeTruth: share(truePositivesInTruth, truth.size),
    gapModelToSample: roundNumber(
      modelTruePositive / rows.length - sampleTruePositive / rows.length
    ),
    gapSampleToWholeTruth: roundNumber(
      sampleTruePositive / rows.length - truePositivesInTruth / truth.size
    ),
  };
};

/**
 * Does the content of the alerts match the truth, for a REAL model? Per kind of alert and truth: how often the model
 * gave the true answer, the opposite answer, or inconclusive. Per planted variant type and for the harmless hash
 * updates: how often the model took them for a true positive. A kind where the model is wrong far more often than the
 * flip rate means that the generated content does not carry the truth for that kind, and a real run on it measures the
 * generator and not the model.
 */
export const contentAgreement = (rows: readonly AnswerRow[]): ContentAgreement => {
  const byKind: Record<
    string,
    { n: number; right: number; opposite: number; inconclusive: number }
  > = {};
  rows
    .filter((r) => !r.variant)
    .forEach((r) => {
      const key = `${r.kind ?? 'unknown'} / ${
        r.truth === 'fp' ? 'false positive' : 'true positive'
      }`;
      const entry = (byKind[key] = byKind[key] ?? { n: 0, right: 0, opposite: 0, inconclusive: 0 });
      entry.n++;
      if (r.answer === 'inc') entry.inconclusive++;
      else if (r.answer === r.truth) entry.right++;
      else entry.opposite++;
    });
  const table = Object.fromEntries(
    Object.entries(byKind)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => [
        key,
        { ...v, rightShare: round(v.right / v.n), oppositeShare: round(v.opposite / v.n) },
      ])
  );
  const variants: Record<string, { n: number; foundAsTruePositive: number }> = {};
  rows.forEach((r) => {
    if (!r.variant) return;
    const entry = (variants[r.variant] = variants[r.variant] ?? { n: 0, foundAsTruePositive: 0 });
    entry.n++;
    if (r.answer === 'tp') entry.foundAsTruePositive++;
  });
  const benign = rows.filter((r) => r.benign);
  return {
    byKindAndTruth: table,
    plantedVariants: Object.fromEntries(
      Object.entries(variants).map(([type, v]) => [
        type,
        { ...v, foundShare: round(v.foundAsTruePositive / v.n) },
      ])
    ),
    harmlessChanges: {
      n: benign.length,
      takenForTruePositive: benign.filter((r) => r.answer === 'tp').length,
    },
  };
};

const keep = <T>(value: T | null | undefined, fallback: T): T =>
  value === null || value === undefined ? fallback : value;

/** The fake LLM settings that follow from the fit. A value with no observation behind it keeps the previous one. */
export const proposeConfig = ({
  verdicts,
  confidence,
  latency,
  tokens,
  previous,
}: {
  verdicts: VerdictFit;
  confidence: ConfidenceFit;
  latency: LatencyFit | null;
  tokens: TokenFit | null;
  previous: FakeLlmConfig;
}): ProposedConfig => ({
  flipRate: {
    falsePositiveAsTruePositive: keep(
      verdicts.flipRate.falsePositiveAsTruePositive.value,
      previous.flipRate.falsePositiveAsTruePositive
    ),
    truePositiveAsFalsePositive: keep(
      verdicts.flipRate.truePositiveAsFalsePositive.value,
      previous.flipRate.truePositiveAsFalsePositive
    ),
  },
  inconclusiveRate: keep(verdicts.inconclusiveRate.value, previous.inconclusiveRate),
  variantMissRate: Object.fromEntries(
    Object.keys(previous.variantMissRate).map((type) => [
      type,
      keep(verdicts.variantMissRate[type]?.value, previous.variantMissRate[type]),
    ])
  ),
  confidence: {
    correct: keep(confidence.correct.distribution, previous.confidence.correct),
    wrong: keep(confidence.wrong.distribution, previous.confidence.wrong),
    inconclusive: keep(confidence.inconclusive.distribution, previous.confidence.inconclusive),
    cacheThreshold: previous.confidence.cacheThreshold,
  },
  latency: latency
    ? { baseMs: latency.baseMs, perAlertMs: latency.perAlertMs, sigma: latency.sigma }
    : previous.latency,
  tokens: tokens
    ? { charsPerToken: tokens.charsPerToken, completionPerAlert: tokens.completionPerAlert }
    : previous.tokens,
});

export interface CalibrateInput {
  calls: readonly FitCall[];
  truth: Truth;
  previous: FakeLlmConfig;
  /**
   * Rule uuids whose answers stay out of every fit (the flip rates, the confidence, the true-positive gap), because
   * the model's reading of them is not a rate that the fake should copy. They are reported apart under `excludedRules`.
   */
  excludeRules?: ReadonlySet<string>;
}

export const calibrate = ({
  calls,
  truth,
  previous,
  excludeRules = new Set<string>(),
}: CalibrateInput): Calibration => {
  const all = joinAnswers(calls, truth);
  const isExcluded = (row: AnswerRow): boolean =>
    row.ruleUuid !== undefined && excludeRules.has(row.ruleUuid);
  const rows = all.filter((row) => !isExcluded(row));
  const excludedRules: Calibration['excludedRules'] = {};
  all.filter(isExcluded).forEach((row) => {
    if (row.ruleUuid === undefined) return;
    const entry = (excludedRules[row.ruleUuid] = excludedRules[row.ruleUuid] ?? {
      answers: 0,
      truthToAnswer: {},
    });
    entry.answers++;
    const key = `${row.truth}>${row.answer}`;
    entry.truthToAnswer[key] = (entry.truthToAnswer[key] ?? 0) + 1;
  });
  const verdicts = fitVerdicts(rows);
  const confidence = fitConfidence(rows);
  const latency = fitLatency(calls);
  const tokens = fitTokens(calls);
  return {
    answers: all.length,
    answersInTheFit: rows.length,
    excludedRules,
    verdicts,
    confidence,
    latency,
    tokens,
    truePositiveGap: rows.length ? truePositiveGap(rows, truth) : null,
    contentAgreement: contentAgreement(all),
    proposedConfig: proposeConfig({ verdicts, confidence, latency, tokens, previous }),
  };
};

interface CalibrateArgs {
  runId: string;
  from: string;
  to: string;
  data: string;
  es: string;
  expectCluster: string;
  connectorId: string;
  previousConfig?: string;
  notesDir: string;
  alertIndex: string;
  excludeRules?: string;
}

const FLAGS: Readonly<Record<string, keyof CalibrateArgs>> = {
  '--run-id': 'runId',
  '--from': 'from',
  '--to': 'to',
  '--data': 'data',
  '--es': 'es',
  '--expect-cluster': 'expectCluster',
  '--connector-id': 'connectorId',
  '--previous-config': 'previousConfig',
  '--notes-dir': 'notesDir',
  '--alert-index': 'alertIndex',
  '--exclude-rules': 'excludeRules',
};

const REQUIRED_ARGS = [
  'runId',
  'from',
  'to',
  'data',
  'es',
  'expectCluster',
  'connectorId',
  'notesDir',
] as const;

export const main = async (): Promise<void> => {
  const args: Partial<CalibrateArgs> = {
    alertIndex: '.alerts-security.alerts-default',
  };
  for (let i = 2; i < process.argv.length; i++) {
    const key = FLAGS[process.argv[i]];
    if (!key) throw new Error(`unknown argument ${process.argv[i]}`);
    args[key] = process.argv[++i];
  }
  REQUIRED_ARGS.forEach((name) => {
    if (!args[name])
      throw new Error(`--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  });
  const parsed = args as CalibrateArgs;
  const request = makeClient(parsed.es);
  const { cluster_name: cluster } = await request<{ cluster_name: string }>('GET', '/');
  if (cluster !== parsed.expectCluster)
    throw new Error(`refusing to run: cluster is "${cluster}", expected "${parsed.expectCluster}"`);

  const truth = await loadTruth(path.join(parsed.data, 'truth.ndjson'));
  const run = await readRun(request, parsed);
  const connectors = [
    ...new Set(run.calls.map((call) => call.connectorId).filter((id): id is string => Boolean(id))),
  ];
  if (connectors.length !== 1 || connectors[0] !== parsed.connectorId) {
    throw new Error(
      `the calls of this window used ${JSON.stringify(connectors)}, expected only ${
        parsed.connectorId
      }; a fake connector is refused`
    );
  }
  const previous: FakeLlmConfig = parsed.previousConfig
    ? (
        JSON.parse(fs.readFileSync(parsed.previousConfig, 'utf8').split('\n')[0]) as {
          config: FakeLlmConfig;
        }
      ).config
    : DEFAULT_CONFIG;
  const excluded = parsed.excludeRules
    ? resolveExcludedRules(parsed.data, parsed.excludeRules.split(';'))
    : { uuids: new Set<string>(), names: [] };
  const result = calibrate({ calls: run.calls, truth, previous, excludeRules: excluded.uuids });

  const out = {
    runId: parsed.runId,
    excludedRuleNames: excluded.names,
    connectorId: parsed.connectorId,
    window: { from: parsed.from, to: parsed.to },
    previousConfig: previous,
    ...result,
  };
  fs.mkdirSync(path.join(parsed.notesDir, 'runs'), { recursive: true });
  const reportFile = path.join(parsed.notesDir, 'runs', `${parsed.runId}_fake_calibration.json`);
  const configFile = path.join(parsed.notesDir, 'runs', `${parsed.runId}_fake_config.json`);
  if (fs.existsSync(reportFile))
    throw new Error(`${reportFile} exists: reports are never overwritten`);
  fs.writeFileSync(reportFile, JSON.stringify(out, null, 2));
  fs.writeFileSync(configFile, JSON.stringify(result.proposedConfig));
  process.stdout.write(`${JSON.stringify({ reportFile, configFile, ...out }, null, 2)}\n`);
};
