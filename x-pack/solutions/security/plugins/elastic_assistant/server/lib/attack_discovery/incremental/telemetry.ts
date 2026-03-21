/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { IncrementalADResult, IncrementalMode } from './types';

/**
 * Telemetry event for incremental attack discovery completion
 */
export interface IncrementalADTelemetryEvent {
  mode: IncrementalMode;
  totalRounds: number;
  totalAlertsProcessed: number;
  deltaSize?: number;
  durationMs: number;
  avgRoundDurationMs: number;
  avgAlertsPerRound: number;
  totalInsights: number;
  avgInsightsPerRound: number;
  mergedInsightCount: number;
  contextBudgetPerRound: number; // estimated tokens
  modelId?: string;
  success: boolean;
}

/**
 * Report incremental attack discovery telemetry
 *
 * Captures key metrics:
 * - Mode (delta/progressive)
 * - Round statistics (count, duration, alerts per round)
 * - Delta size (for delta mode)
 * - Context budget estimates
 * - Insight generation and merging stats
 */
export function reportIncrementalADTelemetry({
  telemetry,
  logger,
  result,
  modelId,
}: {
  telemetry: AnalyticsServiceSetup;
  logger: Logger;
  result: IncrementalADResult;
  modelId?: string;
}): void {
  const { stats, rounds, insights } = result;

  // Calculate derived metrics
  const avgRoundDurationMs =
    stats.totalRounds > 0 ? stats.durationMs / stats.totalRounds : 0;

  const avgAlertsPerRound =
    stats.totalRounds > 0 ? stats.totalAlertsProcessed / stats.totalRounds : 0;

  const avgInsightsPerRound =
    stats.totalRounds > 0
      ? rounds.reduce((sum, r) => sum + r.insightsGenerated, 0) / stats.totalRounds
      : 0;

  const mergedInsightCount = rounds.reduce((sum, r) => sum + r.insightsMerged, 0);

  // Estimate context budget (rough calculation)
  // Assume ~100 tokens per alert + 500 tokens for previous insights
  const contextBudgetPerRound = avgAlertsPerRound * 100 + 500;

  const event: IncrementalADTelemetryEvent = {
    mode: stats.mode,
    totalRounds: stats.totalRounds,
    totalAlertsProcessed: stats.totalAlertsProcessed,
    deltaSize: stats.deltaSize,
    durationMs: stats.durationMs,
    avgRoundDurationMs,
    avgAlertsPerRound,
    totalInsights: insights.length,
    avgInsightsPerRound,
    mergedInsightCount,
    contextBudgetPerRound,
    modelId,
    success: true,
  };

  // Log for debugging
  logger.debug(() => `Incremental AD telemetry: ${JSON.stringify(event, null, 2)}`);

  // Send to analytics
  telemetry.reportEvent('incremental_attack_discovery_completed', event);
}

/**
 * Report incremental attack discovery failure telemetry
 */
export function reportIncrementalADFailure({
  telemetry,
  logger,
  mode,
  error,
  modelId,
}: {
  telemetry: AnalyticsServiceSetup;
  logger: Logger;
  mode: IncrementalMode;
  error: Error;
  modelId?: string;
}): void {
  const event = {
    mode,
    modelId,
    success: false,
    errorMessage: error.message,
    errorStack: error.stack,
  };

  logger.error(() => `Incremental AD failed: ${JSON.stringify(event, null, 2)}`);

  telemetry.reportEvent('incremental_attack_discovery_failed', event);
}

/**
 * Report per-round telemetry (for detailed monitoring)
 */
export function reportRoundTelemetry({
  telemetry,
  logger,
  roundNumber,
  alertsProcessed,
  insightsGenerated,
  insightsMerged,
  durationMs,
  mode,
  sessionId,
}: {
  telemetry: AnalyticsServiceSetup;
  logger: Logger;
  roundNumber: number;
  alertsProcessed: number;
  insightsGenerated: number;
  insightsMerged: number;
  durationMs: number;
  mode: IncrementalMode;
  sessionId: string;
}): void {
  const event = {
    roundNumber,
    alertsProcessed,
    insightsGenerated,
    insightsMerged,
    durationMs,
    mode,
    sessionId,
  };

  logger.debug(() => `Round ${roundNumber} telemetry: ${JSON.stringify(event)}`);

  telemetry.reportEvent('incremental_attack_discovery_round', event);
}
