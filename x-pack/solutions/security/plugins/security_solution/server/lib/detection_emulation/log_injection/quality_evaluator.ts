/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Quality Evaluator — Phase 2
 *
 * Validates that generated documents would actually trigger the target
 * detection rules. Uses the Detection Engine's rule preview
 * infrastructure to run rules against the emulation index without
 * creating persistent alerts.
 *
 * Scoring:
 * - TRUE_POSITIVE: rule fired, matching expected scenario
 * - FALSE_NEGATIVE: rule did NOT fire despite docs being present
 * - NOISE_HIT: rule fired on noise docs (false positive from noise)
 *
 * The evaluator produces a ScoreCard for each scenario execution.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

// ─── Types ─────────────────────────────────────────────────────────────

export interface EvaluationInput {
  scenarioId: string;
  scenarioFingerprint: string;
  /** Rule IDs that were targeted. */
  targetedRuleIds: string[];
  /** Expected alert count per rule. */
  expectedAlerts: Record<string, number>;
  /** The emulation index to search for alerts. */
  emulationIndex: string;
  /** How long to wait for alerts (ms). */
  timeoutMs?: number;
  /** Poll interval (ms). */
  pollIntervalMs?: number;
}

export interface EvaluationResult {
  scenarioId: string;
  overallScore: number;
  ruleResults: RuleResult[];
  metrics: EvaluationMetrics;
  evaluatedAt: string;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  verdict: 'TRUE_POSITIVE' | 'FALSE_NEGATIVE' | 'PARTIAL';
  expectedAlerts: number;
  observedAlerts: number;
  /** Alert document IDs for debugging. */
  alertDocIds: string[];
}

export interface EvaluationMetrics {
  truePositives: number;
  falseNegatives: number;
  partials: number;
  totalRules: number;
  precision: number;
  recall: number;
  f1Score: number;
  evaluationDurationMs: number;
}

export interface EvaluationDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
}

// ─── Polling-based evaluator ───────────────────────────────────────────

/**
 * Evaluate scenario outcomes by polling the alerts index.
 *
 * After documents are injected and rules execute, we poll the
 * `.alerts-security.alerts-*` index for alerts matching the
 * scenario fingerprint. This is the same approach used by
 * telemetry_collector.ts but with scoring semantics.
 */
export async function evaluateScenario(
  input: EvaluationInput,
  deps: EvaluationDeps
): Promise<EvaluationResult> {
  const { scenarioId, scenarioFingerprint, targetedRuleIds, expectedAlerts } = input;
  const { esClient, logger } = deps;
  const timeoutMs = input.timeoutMs ?? 60000;
  const pollIntervalMs = input.pollIntervalMs ?? 5000;

  const startTime = Date.now();
  let observedAlertsByRule: Record<string, { count: number; docIds: string[]; ruleName: string }> = {};

  // Initialize tracking for each targeted rule
  for (const ruleId of targetedRuleIds) {
    observedAlertsByRule[ruleId] = { count: 0, docIds: [], ruleName: '' };
  }

  // Poll loop
  let allExpectedMet = false;
  while (Date.now() - startTime < timeoutMs && !allExpectedMet) {
    try {
      const response = await esClient.search({
        index: '.alerts-security.alerts-*',
        size: 500,
        query: {
          bool: {
            must: [
              { term: { 'kibana.alert.emulation.scenarioFingerprint': scenarioFingerprint } },
            ],
          },
        },
      });

      // Process hits
      for (const hit of response.hits.hits) {
        const source = hit._source as Record<string, any>;
        const ruleId = source?.['kibana.alert.rule.rule_id'] as string;
        const ruleName = source?.['kibana.alert.rule.name'] as string ?? '';
        if (ruleId && observedAlertsByRule[ruleId]) {
          if (!observedAlertsByRule[ruleId].docIds.includes(hit._id!)) {
            observedAlertsByRule[ruleId].count++;
            observedAlertsByRule[ruleId].docIds.push(hit._id!);
            observedAlertsByRule[ruleId].ruleName = ruleName;
          }
        }
      }

      // Check if all expected alerts are met
      allExpectedMet = targetedRuleIds.every((ruleId) => {
        const expected = expectedAlerts[ruleId] ?? 1;
        return (observedAlertsByRule[ruleId]?.count ?? 0) >= expected;
      });

      if (allExpectedMet) break;
    } catch (err) {
      logger.warn(
        `[quality_evaluator] Poll error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Wait before next poll
    if (!allExpectedMet) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  const evaluationDurationMs = Date.now() - startTime;

  // Score each rule
  const ruleResults: RuleResult[] = targetedRuleIds.map((ruleId) => {
    const expected = expectedAlerts[ruleId] ?? 1;
    const observed = observedAlertsByRule[ruleId]?.count ?? 0;

    let verdict: RuleResult['verdict'];
    if (observed >= expected) {
      verdict = 'TRUE_POSITIVE';
    } else if (observed > 0) {
      verdict = 'PARTIAL';
    } else {
      verdict = 'FALSE_NEGATIVE';
    }

    return {
      ruleId,
      ruleName: observedAlertsByRule[ruleId]?.ruleName ?? '',
      verdict,
      expectedAlerts: expected,
      observedAlerts: observed,
      alertDocIds: observedAlertsByRule[ruleId]?.docIds ?? [],
    };
  });

  // Compute metrics
  const truePositives = ruleResults.filter((r) => r.verdict === 'TRUE_POSITIVE').length;
  const falseNegatives = ruleResults.filter((r) => r.verdict === 'FALSE_NEGATIVE').length;
  const partials = ruleResults.filter((r) => r.verdict === 'PARTIAL').length;
  const totalRules = ruleResults.length;

  const precision = totalRules > 0 ? truePositives / totalRules : 0;
  const recall = totalRules > 0 ? (truePositives + partials * 0.5) / totalRules : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  logger.info(
    `[quality_evaluator] Scenario ${scenarioId}: ${truePositives}/${totalRules} TP, ` +
    `${falseNegatives} FN, ${partials} partial, F1=${f1Score.toFixed(3)} (${evaluationDurationMs}ms)`
  );

  return {
    scenarioId,
    overallScore: f1Score,
    ruleResults,
    metrics: {
      truePositives,
      falseNegatives,
      partials,
      totalRules,
      precision,
      recall,
      f1Score,
      evaluationDurationMs,
    },
    evaluatedAt: new Date().toISOString(),
  };
}
