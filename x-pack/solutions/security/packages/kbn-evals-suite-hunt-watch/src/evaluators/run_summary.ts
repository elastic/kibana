/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HuntEvaluator } from './dataset_evaluator';
import { computeScoreStats, type ScoreStats } from '../score_stats';

export type ScoreSink = Map<string, Array<number | null>>;

/** A CODE evaluator result other than 1 or N/A, with the row it came from. */
export interface CodeFailure {
  evaluator: string;
  row: string;
  score: number | null;
  label?: string | null;
  explanation?: string | null;
}

export interface RunCollector {
  scores: ScoreSink;
  codeFailures: CodeFailure[];
}

export const createRunCollector = (): RunCollector => ({ scores: new Map(), codeFailures: [] });

const describeRow = (input: { spaceId: string; reportIds: string[] }): string =>
  `${input.spaceId}: ${input.reportIds.join(', ')}`;

/**
 * Wraps each evaluator so every observed score is recorded, keyed by evaluator
 * name, and every CODE miss is kept with its row. The wrapper is transparent:
 * same inputs, same outputs, same N/A semantics — it only observes.
 */
export const withScoreCollection = (
  evaluators: HuntEvaluator[],
  collector: RunCollector,
  log?: ToolingLog
): HuntEvaluator[] =>
  evaluators.map((evaluator) => ({
    ...evaluator,
    evaluate: async (args: Parameters<HuntEvaluator['evaluate']>[0]) => {
      const result = await evaluator.evaluate(args);
      const bucket = collector.scores.get(evaluator.name) ?? [];
      bucket.push(result.score ?? null);
      collector.scores.set(evaluator.name, bucket);
      const miss = result.score !== 1 && result.label !== 'N/A';
      if (miss && evaluator.kind === 'CODE') {
        collector.codeFailures.push({
          evaluator: evaluator.name,
          row: describeRow(args.input),
          score: result.score ?? null,
          label: result.label,
          explanation: result.explanation,
        });
      }
      // Surface every non-pass so a miss is explained in the run log, not only in score docs.
      if (log && miss) {
        log.warning(
          `⚠️ ${evaluator.name} scored ${result.score ?? result.label}: ${result.explanation ?? ''}`
        );
      }
      return result;
    },
  })) as HuntEvaluator[];

/**
 * The CI pass criterion for CODE evaluators: every applicable check scores exactly 1 on every
 * row. A 0 is a pinned behavior that changed; MISSING is an artifact that should exist and does
 * not. Both fail the dataset after the summary is logged, so a regression in the weekly run
 * turns the step red instead of only lowering a mean. LLM judges are reported, never gated here.
 */
export const assertCodeScoresPass = (datasetName: string, failures: CodeFailure[]): void => {
  if (failures.length === 0) return;
  const lines = failures.map(
    ({ evaluator, row, score, label, explanation }) =>
      `  - ${evaluator} [${row}]: ${score ?? label ?? 'null'}${
        explanation ? ` (${explanation})` : ''
      }`
  );
  throw new Error(
    `${datasetName}: ${
      failures.length
    } CODE evaluator miss(es); every applicable CODE check must score 1\n${lines.join('\n')}`
  );
};

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
