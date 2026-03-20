/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PipelineMetricsCollector } from './metrics';
import type { PipelineExecutionResult } from './types';

const makeResult = (overrides: Partial<PipelineExecutionResult> = {}): PipelineExecutionResult => ({
  executionId: 'exec-1',
  startedAt: '2025-01-01T00:00:00.000Z',
  completedAt: '2025-01-01T00:00:05.000Z',
  alertsProcessed: 10,
  alertsDeduplicated: 2,
  entitiesExtracted: 8,
  entitiesEnriched: 0,
  enrichmentStats: {},
  casesMatched: 3,
  casesCreated: 1,
  alertsAttached: 4,
  adTriggered: 1,
  errors: [],
  ...overrides,
});

describe('PipelineMetricsCollector', () => {
  it('starts with zero metrics', () => {
    const collector = new PipelineMetricsCollector();
    const metrics = collector.getMetrics();

    expect(metrics.totalRuns).toBe(0);
    expect(metrics.lastRunAt).toBeNull();
  });

  it('records a successful run', () => {
    const collector = new PipelineMetricsCollector();
    collector.record(makeResult());

    const metrics = collector.getMetrics();
    expect(metrics.totalRuns).toBe(1);
    expect(metrics.successfulRuns).toBe(1);
    expect(metrics.failedRuns).toBe(0);
    expect(metrics.totalAlertsProcessed).toBe(10);
    expect(metrics.lastRunStatus).toBe('success');
  });

  it('tracks consecutive failures', () => {
    const collector = new PipelineMetricsCollector();
    collector.record(makeResult({ alertsProcessed: 0, errors: ['ES timeout'] }));
    collector.record(makeResult({ alertsProcessed: 0, errors: ['ES timeout'] }));

    expect(collector.getMetrics().consecutiveFailures).toBe(2);

    collector.record(makeResult());
    expect(collector.getMetrics().consecutiveFailures).toBe(0);
  });

  it('reports health as degraded after 2 consecutive failures', () => {
    const collector = new PipelineMetricsCollector();
    collector.record(makeResult({ alertsProcessed: 0, errors: ['err'] }));
    collector.record(makeResult({ alertsProcessed: 0, errors: ['err'] }));

    const health = collector.getHealthStatus();
    expect(health.status).toBe('degraded');
  });

  it('reports health as unhealthy after 5 consecutive failures', () => {
    const collector = new PipelineMetricsCollector();
    for (let i = 0; i < 5; i++) {
      collector.record(makeResult({ alertsProcessed: 0, errors: ['err'] }));
    }

    const health = collector.getHealthStatus();
    expect(health.status).toBe('unhealthy');
  });

  it('marks partial success when some alerts processed but errors exist', () => {
    const collector = new PipelineMetricsCollector();
    collector.record(makeResult({ errors: ['partial error'] }));

    expect(collector.getMetrics().lastRunStatus).toBe('partial');
  });

  it('respects maxHistory rolling window', () => {
    const collector = new PipelineMetricsCollector({ maxHistory: 3 });
    for (let i = 0; i < 5; i++) {
      collector.record(makeResult({ executionId: `exec-${i}` }));
    }

    expect(collector.getMetrics().totalRuns).toBe(3);
  });

  it('calculates average duration', () => {
    const collector = new PipelineMetricsCollector();
    collector.record(
      makeResult({
        startedAt: '2025-01-01T00:00:00.000Z',
        completedAt: '2025-01-01T00:00:10.000Z',
      })
    );
    collector.record(
      makeResult({
        startedAt: '2025-01-01T00:01:00.000Z',
        completedAt: '2025-01-01T00:01:20.000Z',
      })
    );

    expect(collector.getMetrics().averageRunDurationMs).toBe(15000);
  });

  it('reset clears all state', () => {
    const collector = new PipelineMetricsCollector();
    collector.record(makeResult({ alertsProcessed: 0, errors: ['err'] }));
    collector.reset();

    const metrics = collector.getMetrics();
    expect(metrics.totalRuns).toBe(0);
    expect(metrics.consecutiveFailures).toBe(0);
  });
});
