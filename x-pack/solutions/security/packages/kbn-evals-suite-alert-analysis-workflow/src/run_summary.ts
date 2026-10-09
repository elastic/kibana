/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';

export type ScoreSink = Map<string, Array<number | null>>;

/**
 * Wraps each evaluator so every observed score (null = N/A) is recorded,
 * keyed by evaluator name. The wrapper is transparent: same inputs, same
 * outputs, same N/A semantics — it only observes.
 */
export const withScoreCollection = <T extends Evaluator>(evaluators: T[], sink: ScoreSink): T[] =>
  evaluators.map((evaluator) => ({
    ...evaluator,
    evaluate: async (args: Parameters<T['evaluate']>[0]) => {
      const result = await evaluator.evaluate(args);
      const bucket = sink.get(evaluator.name) ?? [];
      bucket.push(result.score ?? null);
      sink.set(evaluator.name, bucket);
      return result;
    },
  })) as T[];

export interface RunSummaryRow {
  name: string;
  scored: number;
  naCount: number;
}

/**
 * Post-run reliability report for the alert-analysis suite, the equivalent of
 * rule-creation's logRunSummary: every N/A is a measurement gap, and without
 * this line the gaps vanish from the report (null scores are excluded from
 * score_stats, so an all-N/A evaluator would otherwise look like nothing at
 * all happened).
 */
export const logRunSummary = ({
  sink,
  datasetName,
  log,
}: {
  sink: ScoreSink;
  datasetName: string;
  log: ToolingLog;
}): RunSummaryRow[] => {
  const rows: RunSummaryRow[] = [];
  let totalNa = 0;
  for (const [name, scores] of sink) {
    const naCount = scores.filter((s) => s == null).length;
    totalNa += naCount;
    rows.push({ name, scored: scores.length - naCount, naCount });
    log.info(
      `📊 ${datasetName} | ${name}: scored ${scores.length - naCount}` +
        `${naCount > 0 ? ` [N/A×${naCount}]` : ''}`
    );
  }
  log.info(`📊 ${datasetName} | total N/A: ${totalNa}`);
  return rows;
};
