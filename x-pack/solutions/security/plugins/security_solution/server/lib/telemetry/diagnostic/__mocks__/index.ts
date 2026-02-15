/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CircuitBreakingQueryExecutorImpl } from '../health_diagnostic_receiver';
import { QueryType, Action } from '../health_diagnostic_service.types';
import type { TelemetryConfigProvider } from '../../../../../common/telemetry_config/telemetry_config_provider';

export const createMockLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    get: jest.fn().mockReturnThis(),
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

export const createMockTaskManager = (): jest.Mocked<TaskManagerStartContract> =>
  ({
    ensureScheduled: jest.fn(),
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

export const createMockAnalytics = (): jest.Mocked<AnalyticsServiceStart> =>
  ({
    reportEvent: jest.fn(),
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

export const createMockTelemetryConfigProvider = (
  isOptedIn = true
): jest.Mocked<TelemetryConfigProvider> =>
  ({
    getIsOptedIn: jest.fn().mockReturnValue(isOptedIn),
    start: jest.fn(),
    stop: jest.fn(),
    getObservable: jest.fn(),
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

export const createMockQueryExecutor = (): jest.Mocked<CircuitBreakingQueryExecutorImpl> =>
  ({
    search: jest.fn(),
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

export const createMockDocument = (overrides = {}) => ({
  '@timestamp': '2023-01-01T00:00:00Z',
  user: { name: 'test-user' },
  event: { action: 'login' },
  ...overrides,
});

export const createMockEsClient = () => {
  const mockHelpers = {
    esql: jest.fn().mockReturnValue({
      toRecords: jest.fn(),
    }),
  };

  return {
    search: jest.fn(),
    eql: {
      search: jest.fn(),
    },
    openPointInTime: jest.fn(),
    closePointInTime: jest.fn(),
    ilm: {
      explainLifecycle: jest.fn(),
    },
    helpers: mockHelpers,
    cluster: { health: jest.fn() },
    nodes: { stats: jest.fn() },
  };
};

export const createMockCircuitBreaker = (valid = true, intervalMs = 1000) => ({
  validate: jest.fn().mockResolvedValue({
    valid,
    message: valid ? 'All good' : 'Circuit breaker triggered',
    circuitBreaker: 'TestCircuitBreaker',
  }),
  stats: jest.fn(),
  validationIntervalMs: jest.fn().mockReturnValue(intervalMs),
});

export const createMockQuery = (type: QueryType, overrides = {}) => ({
  id: 'test-query-1',
  name: 'test-query',
  index: 'test-index',
  type,
  query: type === QueryType.DSL ? '{"query": {"match_all": {}}}' : 'test query',
  scheduleCron: '5m',
  filterlist: { 'user.name': Action.KEEP },
  enabled: true,
  size: 100,
  ...overrides,
});

export const createMockArtifactData = (
  overrides: Partial<{
    id: string;
    name: string;
    index: string;
    type: string;
    query: string;
    scheduleCron: string;
    filterlist: string;
    enabled: boolean;
  }> = {}
) => {
  const defaults = {
    id: 'test-query-1',
    name: 'test-query',
    index: 'test-index',
    type: 'DSL',
    query: '{"query": {"match_all": {}}}',
    scheduleCron: '5m',
    filterlist: 'user.name: keep',
    enabled: true,
  };

  const config = { ...defaults, ...overrides };

  return `---
id: ${config.id}
name: ${config.name}
index: ${config.index}
type: ${config.type}
query: '${config.query}'
scheduleCron: ${config.scheduleCron}
filterlist:
  ${config.filterlist}
enabled: ${config.enabled}`;
};

// Helper functions for common test patterns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockSearchResponse = (hits: any[] = [], aggregations?: any, pitId?: string) => ({
  hits: {
    hits: hits.map((hit) => ({ _source: hit, sort: ['sort1'] })),
  },
  ...(pitId && { pit_id: pitId }),
  ...(aggregations && { aggregations }),
});

export const createMockEqlResponse = (
  events?: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  sequences?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
) => ({
  hits: {
    ...(events && { events: events.map((event) => ({ _source: event })) }),
    ...(sequences && { sequences }),
  },
});

export const setupPointInTime = (
  mockEsClient: ReturnType<typeof createMockEsClient>,
  pitId = 'test-pit-id'
) => {
  mockEsClient.openPointInTime.mockResolvedValue({ id: pitId });
  mockEsClient.closePointInTime.mockResolvedValue({});
};

export const createTestObserver = () => {
  const results: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const observer = {
    next: (result: any) => results.push(result), // eslint-disable-line @typescript-eslint/no-explicit-any
    error: jest.fn(),
    complete: jest.fn(),
  };
  return { results, observer };
};

export const executeObservableTest = <T>(
  observable: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  expectations: (results: T[], done: jest.DoneCallback) => void,
  done: jest.DoneCallback
) => {
  const results: T[] = [];
  observable.subscribe({
    next: (result: T) => results.push(result),
    complete: () => expectations(results, done),
    error: done,
  });
};

// Circuit Breaker Test Helpers
export const createMockEventLoopMonitor = (
  overrides: Partial<{
    min: number;
    max: number;
    mean: number;
    exceeds: number;
    stddev: number;
    percentiles: Record<number, number>;
  }> = {}
) => {
  const defaults = {
    min: 1000000,
    max: 5000000,
    mean: 2000000,
    exceeds: 0,
    stddev: 500000,
    percentiles: {
      50: 2000000,
      75: 3000000,
      90: 4000000,
      95: 4000000,
      99: 4500000,
    },
  };

  const config = { ...defaults, ...overrides };

  return {
    enable: jest.fn(),
    disable: jest.fn(),
    min: config.min,
    max: config.max,
    mean: config.mean,
    exceeds: config.exceeds,
    stddev: config.stddev,
    percentile: jest.fn((p: number) => (config.percentiles as Record<number, number>)[p] || 0),
  };
};

export const createMockPerformance = () => ({
  now: jest.fn(),
  eventLoopUtilization: jest.fn(),
});

export const createMockMemoryUsage = (overrides: Partial<NodeJS.MemoryUsage> = {}) => ({
  rss: 100000000,
  heapTotal: 50000000,
  heapUsed: 25000000,
  external: 1000000,
  arrayBuffers: 500000,
  ...overrides,
});

export const createMockNodeResponse = (
  overrides: Partial<{
    timestamp: number;
    heapUsedPercent: number;
    cpuPercent: number;
  }> = {}
) => {
  const defaults = {
    timestamp: 1234567890,
    heapUsedPercent: 70,
    cpuPercent: 60,
  };
  const config = { ...defaults, ...overrides };

  return {
    timestamp: config.timestamp,
    jvm: { mem: { heap_used_percent: config.heapUsedPercent } },
    os: { cpu: { percent: config.cpuPercent } },
  };
};

export const createElasticsearchCircuitBreakerConfig = (
  overrides: Partial<{
    maxJvmHeapUsedPercent: number;
    maxCpuPercent: number;
    expectedClusterHealth: string[];
    validationIntervalMs: number;
  }> = {}
) => ({
  maxJvmHeapUsedPercent: 85,
  maxCpuPercent: 90,
  expectedClusterHealth: ['green', 'yellow'],
  validationIntervalMs: 5000,
  ...overrides,
});

export const createEventLoopDelayCircuitBreakerConfig = (
  overrides: Partial<{
    thresholdMillis: number;
    validationIntervalMs: number;
  }> = {}
) => ({
  thresholdMillis: 10,
  validationIntervalMs: 5000,
  ...overrides,
});

export const createEventLoopUtilizationCircuitBreakerConfig = (
  overrides: Partial<{
    thresholdMillis: number;
    validationIntervalMs: number;
  }> = {}
) => ({
  thresholdMillis: 1000,
  validationIntervalMs: 5000,
  ...overrides,
});

export const createRssGrowthCircuitBreakerConfig = (
  overrides: Partial<{
    maxRssGrowthPercent: number;
    validationIntervalMs: number;
  }> = {}
) => ({
  maxRssGrowthPercent: 50,
  validationIntervalMs: 5000,
  ...overrides,
});

export const createTimeoutCircuitBreakerConfig = (
  overrides: Partial<{
    timeoutMillis: number;
    validationIntervalMs: number;
  }> = {}
) => ({
  timeoutMillis: 5000,
  validationIntervalMs: 1000,
  ...overrides,
});

// Test assertion helpers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const expectValidCircuitBreakerResult = (result: any, circuitBreakerName: string) => {
  expect(result.valid).toBe(true);
  expect(result.circuitBreaker).toBe(circuitBreakerName);
  expect(result.message).toBeUndefined();
};

export const expectInvalidCircuitBreakerResult = (
  result: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  circuitBreakerName: string,
  expectedMessage?: string
) => {
  expect(result.valid).toBe(false);
  expect(result.circuitBreaker).toBe(circuitBreakerName);
  if (expectedMessage) {
    expect(result.message).toContain(expectedMessage);
  } else {
    expect(result.message).toBeDefined();
  }
};

// Common test setup functions
export const setupMockPerformanceHooks = () => {
  const mockPerformance = createMockPerformance();
  const mockMonitorEventLoopDelay = jest.fn();

  // Mock perf_hooks module
  jest.doMock('perf_hooks', () => ({
    performance: mockPerformance,
    monitorEventLoopDelay: mockMonitorEventLoopDelay,
  }));

  return { mockPerformance, mockMonitorEventLoopDelay };
};
