/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineExecutionResult } from './types';

export interface PipelineMetrics {
  readonly totalRuns: number;
  readonly successfulRuns: number;
  readonly failedRuns: number;
  readonly totalAlertsProcessed: number;
  readonly totalCasesCreated: number;
  readonly totalCasesMatched: number;
  readonly totalAlertsAttached: number;
  readonly totalAdTriggered: number;
  readonly averageRunDurationMs: number;
  readonly lastRunAt: string | null;
  readonly lastRunStatus: 'success' | 'partial' | 'failed' | null;
  readonly consecutiveFailures: number;
}

export interface PipelineHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly reason: string;
  readonly metrics: PipelineMetrics;
  readonly lastExecution: PipelineExecutionResult | null;
}

/**
 * In-memory metrics collector for the alert investigation pipeline.
 * Tracks execution history and provides health status.
 * Maintains a rolling window of recent executions for monitoring.
 */
export class PipelineMetricsCollector {
  private readonly history: Array<PipelineExecutionResult & { durationMs: number }> = [];
  private readonly maxHistory: number;
  private consecutiveFailures = 0;

  constructor({ maxHistory = 100 }: { maxHistory?: number } = {}) {
    this.maxHistory = maxHistory;
  }

  record(result: PipelineExecutionResult): void {
    const durationMs =
      new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();

    this.history.push({ ...result, durationMs });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (result.errors.length > 0 && result.alertsProcessed === 0) {
      this.consecutiveFailures++;
    } else {
      this.consecutiveFailures = 0;
    }
  }

  getMetrics(): PipelineMetrics {
    const totalRuns = this.history.length;
    const successfulRuns = this.history.filter((r) => r.errors.length === 0).length;
    const failedRuns = this.history.filter(
      (r) => r.errors.length > 0 && r.alertsProcessed === 0
    ).length;

    const totalAlertsProcessed = this.history.reduce((s, r) => s + r.alertsProcessed, 0);
    const totalCasesCreated = this.history.reduce((s, r) => s + r.casesCreated, 0);
    const totalCasesMatched = this.history.reduce((s, r) => s + r.casesMatched, 0);
    const totalAlertsAttached = this.history.reduce((s, r) => s + r.alertsAttached, 0);
    const totalAdTriggered = this.history.reduce((s, r) => s + r.adTriggered, 0);

    const avgDuration =
      totalRuns > 0 ? this.history.reduce((s, r) => s + r.durationMs, 0) / totalRuns : 0;

    const lastRun = this.history.length > 0 ? this.history[this.history.length - 1] : null;

    let lastRunStatus: PipelineMetrics['lastRunStatus'] = null;
    if (lastRun) {
      if (lastRun.errors.length === 0) {
        lastRunStatus = 'success';
      } else if (lastRun.alertsProcessed > 0) {
        lastRunStatus = 'partial';
      } else {
        lastRunStatus = 'failed';
      }
    }

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      totalAlertsProcessed,
      totalCasesCreated,
      totalCasesMatched,
      totalAlertsAttached,
      totalAdTriggered,
      averageRunDurationMs: Math.round(avgDuration),
      lastRunAt: lastRun?.completedAt ?? null,
      lastRunStatus,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  getHealthStatus(): PipelineHealthStatus {
    const metrics = this.getMetrics();
    const lastExecution = this.history.length > 0 ? this.history[this.history.length - 1] : null;

    let status: PipelineHealthStatus['status'] = 'healthy';
    let reason = 'Pipeline operating normally';

    if (metrics.consecutiveFailures >= 5) {
      status = 'unhealthy';
      reason = `${metrics.consecutiveFailures} consecutive failures — pipeline may need attention`;
    } else if (metrics.consecutiveFailures >= 2) {
      status = 'degraded';
      reason = `${metrics.consecutiveFailures} consecutive failures — monitoring`;
    } else if (metrics.totalRuns > 0 && metrics.failedRuns / metrics.totalRuns > 0.3) {
      status = 'degraded';
      reason = `High failure rate: ${metrics.failedRuns}/${metrics.totalRuns} runs failed`;
    }

    return { status, reason, metrics, lastExecution };
  }

  reset(): void {
    this.history.length = 0;
    this.consecutiveFailures = 0;
  }
}
