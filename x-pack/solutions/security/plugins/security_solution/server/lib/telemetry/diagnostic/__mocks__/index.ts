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
export const createMockSearchResponse = (hits: any[] = [], aggregations?: any) => ({
  hits: {
    hits: hits.map((hit) => ({ _source: hit, sort: ['sort1'] })),
  },
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
