/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CircuitBreakingQueryExecutorImpl } from '../health_diagnostic_receiver';

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
