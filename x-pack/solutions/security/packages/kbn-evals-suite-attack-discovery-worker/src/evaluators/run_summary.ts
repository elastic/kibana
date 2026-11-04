/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { computeScoreStats, type ScoreStats } from '../score_stats';
import {
  AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME,
  POSITIVE_CONTROL_RECALL_THRESHOLD,
} from './audit_positive_control_recall_evaluator';
import type { WorkerEvaluator } from './dataset_evaluator';

export type ScoreSink = Map<string, Array<number | null>>;

/** A CODE evaluator result below its pass threshold (1 by default), with the row it came from. */
export interface CodeFailure {
  evaluator: string;
  row: string;
  score: number | null;
  label?: string | null;
  explanation?: string | null;
}

/**
 * Score a CODE evaluator needs to pass when it is not exactly 1. Only graded evaluators appear
 * here; their own `recalled`/`missed` label uses the same constant, so the gate and the label
 * cannot disagree.
 */
export const CODE_PASS_THRESHOLDS: Readonly<Record<string, number>> = {
  [AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME]: POSITIVE_CONTROL_RECALL_THRESHOLD,
};

/** N/A is never a miss; a `null` score otherwise is, and so is a score below the pass threshold. */
export const isCodeMiss = ({
  evaluator,
  score,
  label,
}: {
  evaluator: string;
  score: number | null | undefined;
  label?: string | null;
}): boolean => {
  if (label === 'N/A') return false;
  return score == null || score < (CODE_PASS_THRESHOLDS[evaluator] ?? 1);
};

export interface RunCollector {
  scores: ScoreSink;
  codeFailures: CodeFailure[];
}

export const createRunCollector = (): RunCollector => ({ scores: new Map(), codeFailures: [] });

/** `<space>: <scenario>`, tolerating a row whose input is missing or partial. */
export const describeRow = (
  input: { scenarioId?: string; spaceId?: string } | null | undefined
): string =>
  input?.scenarioId === undefined && input?.spaceId === undefined
    ? 'unknown row'
    : `${input.spaceId ?? '?'}: ${input.scenarioId ?? '?'}`;

export const EVALUATOR_FAILED_LABEL = 'EVALUATOR_FAILED';

/**
 * Wraps each evaluator so every observed score is recorded, keyed by evaluator name, and every
 * CODE miss is kept with its row. Scores pass through unchanged, with one exception: an evaluator
 * that throws never escapes. The executor runs evaluators inside the row's job with no catch, so a
 * throw would reject the whole experiment and leave later rows running detached. It becomes a
 * `null` score labelled `EVALUATOR_FAILED` (a miss for CODE evaluators; a judge's null is
 * excluded from its mean, never counted as a pass) and is handed to `onEvaluatorError`, which is
 * what makes the run fail.
 */
export const withScoreCollection = (
  evaluators: WorkerEvaluator[],
  collector: RunCollector,
  log?: ToolingLog,
  onEvaluatorError?: (
    input: { scenarioId?: string; spaceId?: string } | undefined,
    evaluatorName: string,
    error: unknown
  ) => void
): WorkerEvaluator[] =>
  evaluators.map((evaluator) => ({
    ...evaluator,
    evaluate: async (args: Parameters<WorkerEvaluator['evaluate']>[0]) => {
      let result: Awaited<ReturnType<WorkerEvaluator['evaluate']>>;
      try {
        result = await evaluator.evaluate(args);
      } catch (error) {
        onEvaluatorError?.(args.input, evaluator.name, error);
        result = {
          score: null,
          label: EVALUATOR_FAILED_LABEL,
          explanation: error instanceof Error ? error.message : String(error),
        };
      }
      const bucket = collector.scores.get(evaluator.name) ?? [];
      bucket.push(result.score ?? null);
      collector.scores.set(evaluator.name, bucket);
      const miss = isCodeMiss({
        evaluator: evaluator.name,
        score: result.score,
        label: result.label,
      });
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
          `${evaluator.name} scored ${result.score ?? result.label}: ${result.explanation ?? ''}`
        );
      }
      return result;
    },
  }));

/**
 * The pass criterion for CODE evaluators: every applicable check scores 1 on every row, except
 * the graded ones in `CODE_PASS_THRESHOLDS`, which pass at their threshold. A 0 is a pinned
 * behavior that changed; MISSING is an artifact that should exist and does not. Both fail the
 * dataset after the summary is logged. LLM judges are reported, never gated here.
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
    } CODE evaluator miss(es); every applicable CODE check must score 1 (or reach its threshold)\n${lines.join(
      '\n'
    )}`
  );
};

export interface EvaluatorSummaryRow {
  name: string;
  stats: ScoreStats;
}

/**
 * Post-run reliability report. Logged at the end of every dataset so the run states which
 * numbers carry signal:
 *   - CI95: the resolution limit of each mean.
 *   - SATURATED: every score identical and at an extreme, so the evaluator discriminated nothing.
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
      `${datasetName} | ${name}: mean ${
        Number.isNaN(stats.mean) ? 'n/a' : stats.mean.toFixed(3)
      } ${ci} (n=${stats.n})${flags ? ` [${flags}]` : ''}`
    );
  }
  return rows;
};
