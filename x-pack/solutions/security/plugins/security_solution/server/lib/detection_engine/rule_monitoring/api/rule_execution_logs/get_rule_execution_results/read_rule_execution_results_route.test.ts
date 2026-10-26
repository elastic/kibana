/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverMock, requestContextMock, requestMock } from '../../../../routes/__mocks__';

import { READ_RULE_EXECUTION_RESULTS_URL } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { readRuleExecutionResultsRoute } from './read_rule_execution_results_route';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../routes/__mocks__/request_context';

const mockMetrics = {
  total_search_duration_ms: null,
  total_indexing_duration_ms: null,
  execution_gap_duration_s: null,
  alerts_candidate_count: null,
  alert_counts: null,
  matched_indices_count: null,
  frozen_indices_queried_count: null,
};

const mockUnifiedExecutionResults = {
  data: [
    {
      execution_uuid: 'test-uuid-1',
      execution_start: '2026-03-11T11:00:00.000Z',
      execution_duration_ms: 1200,
      schedule_delay_ms: null,
      backfill: null,
      outcome: { status: 'success' as const, message: null },
      metrics: { ...mockMetrics, matched_indices_count: 5 },
    },
    {
      execution_uuid: 'test-uuid-2',
      execution_start: '2026-03-11T10:00:00.000Z',
      execution_duration_ms: 800,
      schedule_delay_ms: null,
      backfill: null,
      outcome: { status: 'warning' as const, message: 'Missing index pattern' },
      metrics: { ...mockMetrics },
    },
  ],
  total: 2,
  page: 1,
  per_page: 20,
};

describe('readRuleExecutionResultsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;

  const getReadRuleExecutionResultsRequest = (
    overrides: {
      ruleId?: string;
      body?: Record<string, unknown>;
    } = {}
  ) =>
    requestMock.create({
      method: 'post',
      path: READ_RULE_EXECUTION_RESULTS_URL,
      params: {
        ruleId: overrides.ruleId ?? '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      },
      body: overrides.body ?? {
        filter: {
          from: '2026-03-11T00:00:00.000Z',
          to: '2026-03-12T00:00:00.000Z',
        },
      },
    });

  beforeEach(async () => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    readRuleExecutionResultsRoute(server.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should return 200 when client returns data', async () => {
    clients.ruleExecutionLog.getUnifiedExecutionResults.mockResolvedValue(
      mockUnifiedExecutionResults
    );

    const response = await server.inject(
      getReadRuleExecutionResultsRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
  });

  it('should return 500 when the client throws', async () => {
    clients.ruleExecutionLog.getUnifiedExecutionResults.mockRejectedValue(new Error('Boom!'));

    const response = await server.inject(
      getReadRuleExecutionResultsRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      message: 'Boom!',
      status_code: 500,
    });
  });

  it('should pass all body parameters to the client', async () => {
    clients.ruleExecutionLog.getUnifiedExecutionResults.mockResolvedValue(
      mockUnifiedExecutionResults
    );

    const body = {
      filter: {
        from: '2026-03-11T00:00:00.000Z',
        to: '2026-03-12T00:00:00.000Z',
        outcome: ['failure'],
        run_type: ['backfill'],
      },
      sort: { field: 'execution_duration_ms', order: 'asc' },
      page: 2,
      per_page: 10,
    };

    await server.inject(
      getReadRuleExecutionResultsRequest({ body }),
      requestContextMock.convertContext(context)
    );

    expect(clients.ruleExecutionLog.getUnifiedExecutionResults).toHaveBeenCalledWith({
      ruleId: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      filter: {
        from: '2026-03-11T00:00:00.000Z',
        to: '2026-03-12T00:00:00.000Z',
        outcome: ['failure'],
        run_type: ['backfill'],
      },
      sort: { field: 'execution_duration_ms', order: 'asc' },
      page: 2,
      perPage: 10,
    });
  });

  it('should use default values for optional parameters', async () => {
    // Freeze time for the duration of the test to avoid flakiness
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2000-01-01T12:00:00.000Z'));

    try {
      clients.ruleExecutionLog.getUnifiedExecutionResults.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      });

      await server.inject(
        getReadRuleExecutionResultsRequest({ body: {} }),
        requestContextMock.convertContext(context)
      );

      const [[args]] = clients.ruleExecutionLog.getUnifiedExecutionResults.mock.calls;
      expect(args.filter?.outcome).toEqual([]);
      expect(args.filter?.run_type).toEqual([]);
      expect(args.sort).toBeUndefined();
      expect(args.page).toBe(1);
      expect(args.perPage).toBe(20);

      // "from" is now minus 2 hours
      expect(args.filter?.from).toBe('2000-01-01T10:00:00.000Z');
      // "to" is now
      expect(args.filter?.to).toBe('2000-01-01T12:00:00.000Z');
    } finally {
      // Unfreeze time
      jest.useRealTimers();
    }
  });
});
