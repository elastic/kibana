/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-example scorecard logging for local runs.
 *
 * Score documents are persisted by the Kibana evals API only when a run
 * supplies the experiment/execution context that `scripts/evals start` builds
 * in CI. A local `scripts/evals run` computes its scorecard in-test and then
 * discards it, so `.evaluation-scores*` stays empty and there is no way to
 * recover per-example numbers without re-running.
 *
 * Setting `EVAL_SCORECARD_LOG=1` emits one machine-readable line per example so
 * a local run yields a numbers table directly from its stage log. Off by
 * default: the line is debugging output, not part of the eval contract.
 */

const SCORECARD_LOG_PREFIX = '[SCORECARD]';

interface LoggerLike {
  info: (message: string) => void;
}

export const isScorecardLogEnabled = (env: Record<string, string | undefined>): boolean => {
  const raw = env.EVAL_SCORECARD_LOG;
  if (raw === undefined) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false';
};

/**
 * Emits `[SCORECARD] {json}` when EVAL_SCORECARD_LOG is set, so per-example
 * scores can be extracted from a local run's log:
 *
 *   grep '\[SCORECARD\]' run.log | sed 's/.*\[SCORECARD\] //' | jq -s .
 */
export const logScorecard = (
  log: LoggerLike,
  entry: {
    level: string;
    exampleId: string;
    scorecard: Record<string, number>;
    metrics?: Record<string, number>;
  },
  env: Record<string, string | undefined> = process.env
): void => {
  if (!isScorecardLogEnabled(env)) return;
  log.info(`${SCORECARD_LOG_PREFIX} ${JSON.stringify(entry)}`);
};
