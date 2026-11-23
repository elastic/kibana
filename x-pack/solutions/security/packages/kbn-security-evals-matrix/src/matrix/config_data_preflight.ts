/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { MatrixConfig } from './load_matrix_config';
import type { AggregatedModelScores } from './query_matrix_scores';

/**
 * Warn when a column's configured evaluator or suite names match nothing in the fetched scores.
 */
export function warnOnConfiguredNamesMissingFromData(
  config: MatrixConfig,
  aggregated: AggregatedModelScores[],
  log: ToolingLog
): void {
  const suitesInData = new Set<string>();
  // Evaluator names actually observed for each suite, not one global pool —
  // a column's allowlist must be checked against the suites it configures,
  // otherwise an evaluator that only exists in an unrelated suite silently
  // passes this preflight while the column itself computes from nothing.
  const evaluatorsBySuite = new Map<string, Set<string>>();

  for (const model of aggregated) {
    for (const suite of model.suites) {
      suitesInData.add(suite.suiteId);
      let evaluatorsForSuite = evaluatorsBySuite.get(suite.suiteId);
      if (!evaluatorsForSuite) {
        evaluatorsForSuite = new Set<string>();
        evaluatorsBySuite.set(suite.suiteId, evaluatorsForSuite);
      }
      for (const dataset of suite.datasets) {
        for (const evaluator of dataset.evaluators) {
          evaluatorsForSuite.add(evaluator.evaluatorName);
        }
      }
    }
  }

  // The caller already fails on an empty result.
  if (suitesInData.size === 0) {
    return;
  }

  for (const column of config.columns) {
    const evaluatorsInScope = new Set<string>();
    for (const suiteId of column.suites) {
      for (const name of evaluatorsBySuite.get(suiteId) ?? []) {
        evaluatorsInScope.add(name);
      }
    }

    const missingEvaluators = (column.evaluators ?? []).filter(
      (name) => !evaluatorsInScope.has(name)
    );
    const missingSuites = (column.suites ?? []).filter((id) => !suitesInData.has(id));

    if (missingEvaluators.length > 0) {
      log.warning(
        `column '${column.id}' names evaluator(s) absent from its own suites' score documents: ` +
          `${missingEvaluators.join(', ')} -- the column still scores, but only over the ` +
          `evaluators that did match, so its value is an average of a subset. ` +
          `Evaluators present in this column's suites: ${
            evaluatorsInScope.size ? [...evaluatorsInScope].sort().join(', ') : '(none)'
          }`
      );
    }

    if (missingSuites.length > 0) {
      log.warning(
        `column '${column.id}' names suite(s) with no scores in this window: ` +
          `${missingSuites.join(', ')}`
      );
    }
  }
}

/**
 * Warn when a suite's freshest data is still inside the lookback window but close to falling out of it.
 */
export function warnOnDataAboutToLeaveLookback(
  config: MatrixConfig,
  aggregated: AggregatedModelScores[],
  log: ToolingLog,
  {
    now = Date.now(),
    warnWithinDays = 14,
    lookbackDays: effectiveLookbackDays,
  }: { now?: number; warnWithinDays?: number; lookbackDays?: number } = {}
): void {
  // Prefer the effective window (CLI --lookback-days / --as-of) over the raw config
  // value so overridden or historical runs warn against the window actually queried.
  const lookbackDays = effectiveLookbackDays ?? config.lookbackDays;
  if (!lookbackDays) {
    return;
  }

  const newestBySuite = new Map<string, number>();
  for (const model of aggregated) {
    for (const suite of model.suites) {
      if (suite.timestamp) {
        const ts = Date.parse(suite.timestamp);
        if (!Number.isNaN(ts)) {
          newestBySuite.set(suite.suiteId, Math.max(newestBySuite.get(suite.suiteId) ?? 0, ts));
        }
      }
    }
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  for (const [suiteId, newest] of newestBySuite) {
    const ageDays = (now - newest) / DAY_MS;
    const daysLeft = Math.floor(lookbackDays - ageDays);
    if (daysLeft >= 0 && daysLeft <= warnWithinDays) {
      const columns = config.columns
        .filter((column) => column.suites.includes(suiteId))
        .map((column) => column.id);

      log.warning(
        `Suite \`${suiteId}\` has no run newer than ${new Date(newest)
          .toISOString()
          .slice(
            0,
            10
          )}; it leaves the ${lookbackDays}-day lookback in ${daysLeft} day(s), after ` +
          `which these columns go blank with no other signal: ${
            columns.length ? columns.join(', ') : '(none)'
          }. Re-run the suite or pin the column to a branch with fresher data.`
      );
    }
  }
}
