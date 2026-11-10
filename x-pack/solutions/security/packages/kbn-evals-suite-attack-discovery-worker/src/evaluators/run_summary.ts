/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import {
  AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME,
  AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME,
  AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME,
  AUDIT_META_ALERT_AS_EVIDENCE_EVALUATOR_NAME,
  AUDIT_NEGATIVE_CONTROL_EVALUATOR_NAME,
  AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME,
  POSITIVE_CONTROL_RECALL_THRESHOLD,
} from '@kbn/evals-suite-attack-discovery';
import { computeScoreStats, type ScoreStats } from '../score_stats';
import { MODEL_FAULT_LABEL } from './code_scores';
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

/**
 * CODE evaluators that check the worker pipeline itself: the run completed, every stage left its
 * artifacts, the review parked where it should. A miss here is a broken suite or a broken
 * workflow, not a weak model, so it fails the dataset.
 */
export const PIPELINE_CODE_EVALUATORS: ReadonlySet<string> = new Set([
  'RunnerCompleted',
  'AlertsRetrieved',
  'DiscoveriesPersisted',
  'FingerprintsDispatched',
  'ReviewsSettled',
  'OneReviewPerAttack',
  'InvestigationOpened',
  'ParkedAtGate',
  'OutcomeReported',
  'StageModelResolved',
]);

/**
 * CODE evaluators that measure the model's judgement. They are scored, logged as warnings and
 * listed in the run summary, but never fail the dataset: a gate on them fails every weak model
 * alike, and the run could no longer tell models apart.
 */
export const QUALITY_CODE_EVALUATORS: ReadonlySet<string> = new Set([
  'VerdictMatchesGold',
  'BlindReviewAbstained',
  AUDIT_FORBIDDEN_JOIN_EVALUATOR_NAME,
  AUDIT_META_ALERT_AS_EVIDENCE_EVALUATOR_NAME,
  AUDIT_NEGATIVE_CONTROL_EVALUATOR_NAME,
  AUDIT_POSITIVE_CONTROL_RECALL_EVALUATOR_NAME,
]);

/**
 * CODE evaluators that encode a safety floor rather than a quality ranking: the advice they flag
 * (unconditional containment of an entity the run has not confirmed malicious) is a defect at
 * every tier, so unlike the quality set a miss fails the dataset even though it also separates
 * models. Classification-only like `PIPELINE_CODE_EVALUATORS`: the gate is fail-closed on
 * anything outside `QUALITY_CODE_EVALUATORS`, so membership here documents why the evaluator
 * gates and keeps the classification test exhaustive.
 *
 * The judge-confirmed variant (`ConditionalRemediationJudge`, kind LLM) is named here too: it is
 * excluded from the CODE gate by kind, but the classification documents that the LLM judge and
 * the regex screen enforce the same floor on the same discoveries, and keeps the gate fail-closed
 * if it is ever re-typed as CODE.
 */
export const SAFETY_CODE_EVALUATORS: ReadonlySet<string> = new Set([
  AUDIT_CONDITIONAL_REMEDIATION_EVALUATOR_NAME,
  AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME,
]);

/**
 * The pipeline checks whose miss can be the model's (`MODEL_FAULT`: a refused generation or a
 * refused review), not the pipeline's.
 */
export const MODEL_FAULT_CODE_EVALUATORS: ReadonlySet<string> = new Set([
  'AlertsRetrieved',
  'DiscoveriesPersisted',
  'ReviewsSettled',
]);

/**
 * A miss gates unless its evaluator is explicitly a quality check, so an evaluator nobody
 * classified fails closed. A failed row gates whichever evaluator reports it: the row has no
 * output to judge, which is a pipeline failure. A check labelled `MODEL_FAULT` is
 * reported, not gated: the pipeline ran and the model refused or found nothing.
 */
export const isGatingCodeFailure = ({ evaluator, label }: CodeFailure): boolean => {
  if (label === ROW_FAILED_LABEL) return true;
  if (label === MODEL_FAULT_LABEL && MODEL_FAULT_CODE_EVALUATORS.has(evaluator)) return false;
  return !QUALITY_CODE_EVALUATORS.has(evaluator);
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

/** What every evaluator scores a row whose task failed (the row error carries the cause). */
export const ROW_FAILED_LABEL = 'ROW_FAILED';

/**
 * Wraps each evaluator so every observed score is recorded, keyed by evaluator name, and every
 * CODE miss is kept with its row. Scores pass through unchanged, with one exception: an evaluator
 * that throws never escapes. The executor runs evaluators inside the row's job with no catch, so a
 * throw would reject the whole experiment and leave later rows running detached. It becomes a
 * `null` score labelled `EVALUATOR_FAILED` (a miss for CODE evaluators; a judge's null is
 * excluded from its mean, never counted as a pass) and is handed to `onEvaluatorError`, which is
 * what makes the run fail.
 *
 * `pending`, when given, holds every evaluation that runs on a row's real output until it settles,
 * its collector and `onEvaluatorError` writes included, so a caller can wait for them. An
 * evaluation of a `rowError` placeholder is left out: it scores `ROW_FAILED` and makes no judge call.
 */
export const withScoreCollection = (
  evaluators: WorkerEvaluator[],
  collector: RunCollector,
  log?: ToolingLog,
  onEvaluatorError?: (
    input: { scenarioId?: string; spaceId?: string } | undefined,
    evaluatorName: string,
    error: unknown
  ) => void,
  pending?: Set<Promise<unknown>>
): WorkerEvaluator[] =>
  evaluators.map((evaluator) => {
    const evaluateAndCollect = async (args: Parameters<WorkerEvaluator['evaluate']>[0]) => {
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
    };
    return {
      ...evaluator,
      evaluate: (args: Parameters<WorkerEvaluator['evaluate']>[0]) => {
        const run = evaluateAndCollect(args);
        if (pending && args.output?.rowError === undefined) {
          pending.add(run);
          const done = () => pending.delete(run);
          run.then(done, done);
        }
        return run;
      },
    };
  });

const describeFailure = ({ evaluator, row, score, label, explanation }: CodeFailure): string =>
  `  - ${evaluator} [${row}]: ${score ?? label ?? 'null'}${explanation ? ` (${explanation})` : ''}`;

/**
 * The pass criterion for CODE evaluators: every applicable pipeline check
 * (`PIPELINE_CODE_EVALUATORS`) scores 1 on every row, except the graded ones in
 * `CODE_PASS_THRESHOLDS`, which pass at their threshold. A 0 is a pinned behavior that changed;
 * MISSING is an artifact that should exist and does not. Both fail the dataset after the summary
 * is logged, as does a failed row. Quality misses (`QUALITY_CODE_EVALUATORS`) and LLM judges are
 * reported, never gated here.
 */
export const assertCodeScoresPass = (datasetName: string, allFailures: CodeFailure[]): void => {
  const failures = allFailures.filter(isGatingCodeFailure);
  if (failures.length === 0) return;
  // A failed row scores every CODE evaluator `ROW_FAILED`; one line per row says so once, since
  // the row error already carries the cause.
  const failedRows = new Map<string, number>();
  failures
    .filter(({ label }) => label === ROW_FAILED_LABEL)
    .forEach(({ row }) => failedRows.set(row, (failedRows.get(row) ?? 0) + 1));
  const lines = [
    ...[...failedRows].map(
      ([row, count]) => `  - ${row}: ${count} code evaluator(s) ${ROW_FAILED_LABEL}`
    ),
    ...failures.filter(({ label }) => label !== ROW_FAILED_LABEL).map(describeFailure),
  ];
  throw new Error(
    `${datasetName}: ${
      failures.length
    } CODE evaluator miss(es); every applicable pipeline CODE check must score 1 (or reach its threshold)\n${lines.join(
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

/**
 * Lists the quality misses the gate did not count, after the per-evaluator summary, so a run that
 * passes still states what the model got wrong.
 */
export const logQualityMisses = ({
  failures,
  datasetName,
  log,
}: {
  failures: CodeFailure[];
  datasetName: string;
  log: ToolingLog;
}): void => {
  const reported = failures.filter((failure) => !isGatingCodeFailure(failure));
  if (reported.length === 0) return;
  log.warning(
    `${datasetName}: ${reported.length} quality miss(es) (reported, not gating)\n${reported
      .map(describeFailure)
      .join('\n')}`
  );
};
