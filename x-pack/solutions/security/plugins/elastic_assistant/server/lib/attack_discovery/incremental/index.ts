/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { StateTracker } from './state_tracker';
import { computeDelta } from './delta_computer';
import { processInRounds } from './round_processor';
import type { IncrementalADConfig, IncrementalADResult, Alert } from './types';

const PROMPT_OVERHEAD_TOKENS = 2000;
const AVG_TOKENS_PER_ALERT = 200;
const OUTPUT_RESERVE_TOKENS = 3000;
const DEFAULT_CONTEXT_BUDGET = 32000;
const MIN_ALERTS_PER_ROUND = 10;
const MAX_ALERTS_PER_ROUND = 100;

/**
 * Computes the optimal alertsPerRound based on a model context budget.
 * Uses token-based estimates to fill the available context window.
 */
export function computeAlertsPerRound(contextBudget: number = DEFAULT_CONTEXT_BUDGET): number {
  const availableForAlerts = contextBudget - PROMPT_OVERHEAD_TOKENS - OUTPUT_RESERVE_TOKENS;
  const computed = Math.floor(availableForAlerts / AVG_TOKENS_PER_ALERT);
  return Math.max(MIN_ALERTS_PER_ROUND, Math.min(MAX_ALERTS_PER_ROUND, computed));
}

export async function incrementalAttackDiscovery({
  mode,
  alerts,
  existingInsights = [],
  config,
  esClient,
  sessionId,
  generateInsights,
}: {
  mode: 'delta' | 'progressive';
  alerts: Alert[];
  existingInsights?: AttackDiscovery[];
  config: Partial<IncrementalADConfig>;
  esClient: ElasticsearchClient;
  sessionId: string;
  generateInsights: (alerts: Alert[], previousInsights?: AttackDiscovery[]) => Promise<AttackDiscovery[]>;
}): Promise<IncrementalADResult> {
  const startTime = Date.now();

  const fullConfig: IncrementalADConfig = {
    mode,
    alertsPerRound: config.alertsPerRound ?? computeAlertsPerRound(config.contextBudget),
    maxRounds: config.maxRounds ?? 20,
    mergeStrategy: config.mergeStrategy ?? 'rule-based',
    similarityThreshold: config.similarityThreshold ?? 0.6,
  };

  const stateTracker = new StateTracker(esClient, sessionId);

  // DELTA MODE: Filter to new alerts first
  let alertsToProcess = alerts;
  let deltaSize: number | undefined;

  if (mode === 'delta') {
    alertsToProcess = await computeDelta(alerts, stateTracker);
    deltaSize = alertsToProcess.length;

    if (alertsToProcess.length === 0) {
      // No new alerts - return existing insights
      return {
        insights: existingInsights,
        rounds: [],
        stats: {
          mode: 'delta',
          totalRounds: 0,
          totalAlertsProcessed: 0,
          deltaSize: 0,
          durationMs: Date.now() - startTime,
        },
      };
    }
  }

  // BOTH MODES: Process in rounds if needed
  let result;

  if (alertsToProcess.length > fullConfig.alertsPerRound) {
    // Multiple rounds needed
    result = await processInRounds({
      alerts: alertsToProcess,
      alertsPerRound: fullConfig.alertsPerRound,
      maxRounds: fullConfig.maxRounds,
      generateInsights,
      existingInsights,
      mergeStrategy: fullConfig.mergeStrategy,
    });

    // Mark all as processed
    await stateTracker.markProcessed(
      result.rounds.flatMap(r => r.alertsProcessed),
      result.rounds.length
    );
  } else {
    // Single round (delta is small OR progressive with <50 alerts)
    const insights = await generateInsights(alertsToProcess, existingInsights);

    await stateTracker.markProcessed(
      alertsToProcess.map(a => a.id),
      1
    );

    result = {
      rounds: [{
        roundNumber: 1,
        alertsProcessed: alertsToProcess.map(a => a.id),
        insightsGenerated: insights.length,
        insightsMerged: 0,
        durationMs: Date.now() - startTime,
      }],
      insights,
    };
  }

  return {
    insights: result.insights,
    rounds: result.rounds,
    stats: {
      mode,
      totalRounds: result.rounds.length,
      totalAlertsProcessed: result.rounds.reduce((sum, r) => sum + r.alertsProcessed.length, 0),
      deltaSize,
      durationMs: Date.now() - startTime,
    },
  };
}

// Re-export components
export { StateTracker } from './state_tracker';
export { computeDelta } from './delta_computer';
export { mergeInsights } from './insight_merger';
export { processInRounds } from './round_processor';
export type * from './types';
