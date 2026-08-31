/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleEvaluator } from './dataset_evaluator';
import { computeScoreStats, type ScoreStats } from '../score_stats';

export type ScoreSink = Map<string, Array<number | null>>;

/**
 * Per-example scores keyed as `${evaluatorName}::${exampleId}` — the join key for
 * PAIRED comparisons across arms (same example, two prompt revisions). Dataset
 * means cannot resolve small deltas at this sample size (measured: ±0.16-0.19
 * CI half-width at n=15, build 479); per-example pairing removes example-difficulty
 * variance and is the only readout that can.
 */
export type PairedScoreSink = Map<string, number | null>;

/**
 * Wraps each evaluator so every observed score is recorded, keyed by evaluator
 * name. The wrapper is transparent: same inputs, same outputs, same N/A
 * semantics — it only observes.
 */
export const withScoreCollection = (
  evaluators: RuleEvaluator[],
  sink: ScoreSink,
  pairedSink: PairedScoreSink
): RuleEvaluator[] =>
  evaluators.map((evaluator) => ({
    ...evaluator,
    evaluate: async (args: Parameters<RuleEvaluator['evaluate']>[0]) => {
      const result = await evaluator.evaluate(args);
      const bucket = sink.get(evaluator.name) ?? [];
      bucket.push(result.score ?? null);
      sink.set(evaluator.name, bucket);
      // EvaluatorParams carries no example id (the executor holds it), so key by the
      // input payload — stable and unique per example in this suite's datasets.
      const exampleKey = JSON.stringify(args.input ?? {});
      pairedSink.set(`${evaluator.name}::${exampleKey}`, result.score ?? null);
      return result;
    },
  })) as RuleEvaluator[];

export interface EvaluatorSummaryRow {
  name: string;
  stats: ScoreStats;
}

/**
 * Post-run reliability report. Logged at the end of every dataset so the run
 * itself states which numbers carry signal:
 *   - CI95: the resolution limit of each mean. Deltas smaller than this are
 *     noise, whatever the means table looks like.
 *   - SATURATED: every score identical and at an extreme — the evaluator
 *     discriminated nothing this run (fine for a smoke check, useless for
 *     model comparison, and it should not be averaged into an overall score).
 *   - N/A > 0: measurement gaps, each one a place the run measured nothing.
 */
export const logRunSummary = ({
  sink,
  datasetName,
  log,
}: {
  sink: ScoreSink;
  datasetName: string;
  log: ToolingLog;
}): EvaluatorSummaryRow[] => {
  const rows: EvaluatorSummaryRow[] = [];
  for (const [name, scores] of sink) {
    const stats = computeScoreStats(scores);
    rows.push({ name, stats });
    const ci = stats.n > 1 ? `±${stats.ci95.toFixed(3)}` : stats.n === 1 ? '±0.000(n=1)' : 'n/a';
    const flags = [
      stats.saturated ? 'SATURATED(no signal)' : '',
      stats.naCount > 0 ? `N/A×${stats.naCount}` : '',
      stats.n === 0 ? 'UNMEASURED' : '',
    ]
      .filter(Boolean)
      .join(' ');
    log.info(
      `📊 ${datasetName} | ${name}: mean ${
        Number.isNaN(stats.mean) ? 'n/a' : stats.mean.toFixed(3)
      } ${ci} (n=${stats.n})${flags ? ` [${flags}]` : ''}`
    );
  }
  return rows;
};

/**
 * Serializes the paired sink for cross-run comparison: one JSON line per example
 * per evaluator, parseable by `pairedDeltas` in score_stats.ts. Printed at the
 * end of each dataset run so an A/B readout needs nothing but the two build logs.
 */
export const logPairedScores = ({
  pairedSink,
  datasetName,
  log,
}: {
  pairedSink: PairedScoreSink;
  datasetName: string;
  log: ToolingLog;
}): void => {
  if (pairedSink.size === 0) return;
  const payload = JSON.stringify({ dataset: datasetName, scores: Object.fromEntries(pairedSink) });
  for (const line of payload.match(/.{1,8000}/g) ?? [payload]) {
    log.info(`PAIRED_SCORES ${line}`);
  }
};
