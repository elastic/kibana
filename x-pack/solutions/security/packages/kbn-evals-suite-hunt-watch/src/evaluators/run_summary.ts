/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HuntEvaluator } from './dataset_evaluator';
import type { HuntGate, HuntRowMetadata } from '../types';
import { computeScoreStats, type ScoreStats } from '../score_stats';

export type ScoreSink = Map<string, Array<number | null>>;

/** A CODE evaluator result other than 1 or N/A, with the row it came from. */
export interface CodeFailure {
  evaluator: string;
  row: string;
  /** The row's gate tag; absent means `invariant`. */
  gate?: HuntGate;
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
        const { gate } = (args.metadata ?? {}) as HuntRowMetadata;
        collector.codeFailures.push({
          evaluator: evaluator.name,
          row: describeRow(args.input),
          ...(gate ? { gate } : {}),
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

const describeFailure = ({ evaluator, row, score, label, explanation }: CodeFailure): string =>
  `  - ${evaluator} [${row}]: ${score ?? label ?? 'null'}${explanation ? ` (${explanation})` : ''}`;

// One failed Tier 2 grounding scores 0 on every downstream check of the row (outcome, hit, SSE,
// evidence, Proposal). Naming the coordinator status once keeps six misses from reading as six
// regressions.
const rootCauseOf = (failures: CodeFailure[]): string | undefined => {
  for (const { explanation } of failures) {
    const coordinator = explanation?.match(/coordinator (\w+)/)?.[1];
    if (coordinator) return `coordinator ${coordinator}`;
  }
  for (const { explanation } of failures) {
    const outcome = explanation?.match(/outcome "(\w+)"/)?.[1];
    if (outcome) return `outcome ${outcome}`;
  }
  return undefined;
};

/** One line per row: the evaluators that missed and the shared root cause, if one is named. */
export const summarizeFailuresByRow = (failures: CodeFailure[]): string[] => {
  const byRow = new Map<string, CodeFailure[]>();
  for (const failure of failures) {
    byRow.set(failure.row, [...(byRow.get(failure.row) ?? []), failure]);
  }
  return [...byRow].map(([row, rowFailures]) => {
    const cause = rootCauseOf(rowFailures);
    return `  [${row}] ${rowFailures.length} miss(es)${cause ? `, root cause: ${cause}` : ''}: ${[
      ...new Set(rowFailures.map(({ evaluator }) => evaluator)),
    ].join(', ')}`;
  });
};

/**
 * The CI pass criterion for CODE evaluators: every applicable check scores exactly 1 on every
 * gating row. A 0 is a pinned behavior that changed; MISSING is an artifact that should exist and
 * does not. Both fail the dataset after the summary is logged, so a regression in the weekly run
 * turns the step red instead of only lowering a mean. LLM judges are reported, never gated here.
 *
 * Rows tagged `capability` gate only when `gatesCapability` is true (a reference subject model,
 * see `reference_models.ts`). For any other model their misses are logged as a capability
 * report and the dataset passes on its invariant rows alone.
 */
export const assertCodeScoresPass = (
  datasetName: string,
  failures: CodeFailure[],
  { gatesCapability = true, log }: { gatesCapability?: boolean; log?: ToolingLog } = {}
): void => {
  const gating = failures.filter(({ gate }) => gatesCapability || gate !== 'capability');
  const reported = failures.filter((failure) => !gating.includes(failure));
  if (reported.length > 0) {
    log?.warning(
      `${datasetName}: ${
        reported.length
      } CODE miss(es) on capability rows, reported and not gated for this subject model:\n${summarizeFailuresByRow(
        reported
      ).join('\n')}`
    );
  }
  if (gating.length === 0) return;
  throw new Error(
    `${datasetName}: ${
      gating.length
    } CODE evaluator miss(es); every applicable CODE check must score 1\n${summarizeFailuresByRow(
      gating
    ).join('\n')}\n${gating.map(describeFailure).join('\n')}`
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
