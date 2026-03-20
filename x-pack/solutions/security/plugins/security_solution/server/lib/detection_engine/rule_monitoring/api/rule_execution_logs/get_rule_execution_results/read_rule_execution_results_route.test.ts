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
  duration_ms: null,
  candidate_alerts_count: null,
  scheduling_delay: null,
  search_duration: null,
  backfill: null,
  indices_found: null,
  indexed_alerts_count: null,
  alerts_created_count: null,
  gap_duration: null,
  index_duration: null,
  matched_indices: null,
};

const mockUnifiedExecutionResults = {
  events: [
    {
      execution_uuid: 'test-uuid-1',
      timestamp: '2026-03-11T11:00:00.000Z',
      status: 'succeeded',
      metrics: { ...mockMetrics, duration_ms: 500, indices_found: 5 },
      errors: [],
      warnings: [],
    },
    {
      execution_uuid: 'test-uuid-2',
      timestamp: '2026-03-11T10:00:00.000Z',
      status: 'warning',
      metrics: { ...mockMetrics, duration_ms: 300 },
      errors: [],
      warnings: [{ message: 'Missing index pattern' }],
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

  const getReadRuleExecutionResultsRequest = (overrides: {
    ruleId?: string;
    body?: Record<string, unknown>;
  } = {}) =>
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

  it('should return 200 with results when client returns data', async () => {
    clients.ruleExecutionLog.getUnifiedExecutionResults.mockResolvedValue(
      mockUnifiedExecutionResults
    );

    const response = await server.inject(
      getReadRuleExecutionResultsRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockUnifiedExecutionResults);
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
        status: ['failed'],
        run_type: ['backfill'],
      },
      sort: { field: 'duration_ms', order: 'asc' },
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
        status: ['failed'],
        run_type: ['backfill'],
      },
      sort: { field: 'duration_ms', order: 'asc' },
      page: 2,
      perPage: 10,
    });
  });

  it('should use default values for optional parameters', async () => {
    clients.ruleExecutionLog.getUnifiedExecutionResults.mockResolvedValue({
      events: [],
      total: 0,
      page: 1,
      per_page: 20,
    });

    await server.inject(
      getReadRuleExecutionResultsRequest(),
      requestContextMock.convertContext(context)
    );

    expect(clients.ruleExecutionLog.getUnifiedExecutionResults).toHaveBeenCalledWith({
      ruleId: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      filter: {
        from: '2026-03-11T00:00:00.000Z',
        to: '2026-03-12T00:00:00.000Z',
        status: [],
        run_type: [],
      },
      sort: undefined,
      page: 1,
      perPage: 20,
    });
  });
});
