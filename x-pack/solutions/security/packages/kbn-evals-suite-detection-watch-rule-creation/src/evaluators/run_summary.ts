/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleEvaluator } from './dataset_evaluator';
import { computeScoreStats, type ScoreStats } from '../score_stats';

/**
 * Deterministic djb2-style multiplicative hash rendered as 8 hex chars — stable
 * across runs (the join key for paired A/B) without node:crypto or bitwise
 * operators, both of which this package forbids.
 */
const stableHash = (value: string): string => {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = (h * 33 + value.charCodeAt(i)) % 0xffffffff;
  }
  return h.toString(16).padStart(8, '0');
};

export type ScoreSink = Map<string, Array<number | null>>;

/**
 * Per-example scores keyed as `${evaluatorName}::${exampleId}` — the join key for
 * PAIRED comparisons across arms (same example, two prompt revisions). Dataset
 * means cannot resolve small deltas at this sample size (measured: ±0.16-0.19
 * CI half-width at n=15, build 479); per-example pairing removes example-difficulty
 * variance and is the only readout that can.
 */
export type PairedScoreSink = Map<string, Array<number | null>>;

/** Maps the hashed PAIRED_SCORES keys back to their full input payloads (logged once per run). */
export const exampleKeyLog = new Map<string, string>();

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
      // Short hashed key (full input JSON was 400+ chars and ungrepable; the mapping
      // line in logPairedScores keeps it traceable). Reps are APPENDED, not
      // overwritten — the first A/B silently kept only the last rep of each example
      // (n=7 pairs instead of n=21).
      const inputJson = JSON.stringify(args.input ?? {});
      const shortKey = `${evaluator.name}::${stableHash(inputJson)}`;
      const pairedBucket = pairedSink.get(shortKey) ?? [];
      pairedBucket.push(result.score ?? null);
      pairedSink.set(shortKey, pairedBucket);
      exampleKeyLog.set(shortKey, inputJson);
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
  // Per-key mean across reps (nulls dropped; all-null keys stay null).
  const scores: Record<string, number | null> = {};
  for (const [key, reps] of pairedSink) {
    const scored = reps.filter((v): v is number => v !== null);
    scores[key] = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  }
  const payload = JSON.stringify({ dataset: datasetName, scores });
  for (const line of payload.match(/.{1,8000}/g) ?? [payload]) {
    log.info(`PAIRED_SCORES ${line}`);
  }
  // Human-traceable mapping for this dataset only. exampleKeyLog is process-wide;
  // iterating it directly re-printed every earlier dataset (279 lines in build 498).
  const datasetHashes = new Set(
    pairedSink.keys().map((key) => key.slice(key.lastIndexOf('::') + 2))
  );
  for (const hash of datasetHashes) {
    const inputJson = exampleKeyLog.get(hash);
    if (inputJson) {
      try {
        const technique =
          (JSON.parse(inputJson) as { technique?: string }).technique ?? inputJson.slice(0, 60);
        log.info(`PAIRED_KEY ${hash} -> ${technique}`);
      } catch {
        log.info(`PAIRED_KEY ${hash} -> ${inputJson.slice(0, 60)}`);
      }
    }
  }
};
