/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { queryActionTriggeredGenerations } from './helpers/query_action_triggered_generations';
import type { QueryActionTriggeredGenerationsResult } from './helpers/query_action_triggered_generations';

jest.mock('./helpers/query_action_triggered_generations');
const mockQueryActionTriggeredGenerations = queryActionTriggeredGenerations as jest.MockedFunction<
  typeof queryActionTriggeredGenerations
>;

jest.mock('../../../lib/assert_workflows_enabled', () => ({
  assertWorkflowsEnabled: jest.fn().mockResolvedValue(null),
}));

import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';

const mockResult: QueryActionTriggeredGenerationsResult = {
  data: [
    {
      connector_id: 'connector-1',
      execution_uuid: 'exec-uuid-1',
      source_metadata: {
        action_execution_uuid: 'action-exec-1',
        rule_id: 'rule-1',
        rule_name: 'Test Rule',
      },
      status: 'succeeded',
      timestamp: '2026-03-10T12:00:00.000Z',
    },
  ],
  total: 1,
};

describe('getActionTriggeredGenerations route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryActionTriggeredGenerations.mockResolvedValue(mockResult);
  });

  it('delegates to queryActionTriggeredGenerations', async () => {
    mockQueryActionTriggeredGenerations.mockResolvedValue(mockResult);

    const result = await queryActionTriggeredGenerations({
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      from: 0,
      size: 20,
      spaceId: 'default',
    });

    expect(mockQueryActionTriggeredGenerations).toHaveBeenCalledWith({
      esClient: expect.anything(),
      eventLogIndex: '.kibana-event-log-test',
      from: 0,
      size: 20,
      spaceId: 'default',
    });
    expect(result).toEqual(mockResult);
  });

  it('returns empty results when no action-triggered generations exist', async () => {
    const emptyResult: QueryActionTriggeredGenerationsResult = {
      data: [],
      total: 0,
    };

    mockQueryActionTriggeredGenerations.mockResolvedValue(emptyResult);

    const result = await queryActionTriggeredGenerations({
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      from: 0,
      size: 20,
      spaceId: 'default',
    });

    expect(result).toEqual(emptyResult);
  });

  it('passes start and end params to queryActionTriggeredGenerations', async () => {
    await queryActionTriggeredGenerations({
      end: 'now',
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      from: 0,
      size: 20,
      spaceId: 'default',
      start: 'now-24h',
    });

    expect(mockQueryActionTriggeredGenerations).toHaveBeenCalledWith(
      expect.objectContaining({
        end: 'now',
        start: 'now-24h',
      })
    );
  });

  it('passes search param to queryActionTriggeredGenerations', async () => {
    await queryActionTriggeredGenerations({
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      from: 0,
      search: 'my-rule',
      size: 20,
      spaceId: 'default',
    });

    expect(mockQueryActionTriggeredGenerations).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'my-rule',
      })
    );
  });

  it('passes status param to queryActionTriggeredGenerations', async () => {
    await queryActionTriggeredGenerations({
      esClient: {} as never,
      eventLogIndex: '.kibana-event-log-test',
      from: 0,
      size: 20,
      spaceId: 'default',
      status: ['running', 'failed'],
    });

    expect(mockQueryActionTriggeredGenerations).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['running', 'failed'],
      })
    );
  });
});

describe('registerGetActionTriggeredGenerationsRoute feature flag', () => {
  it('returns 404 when the feature flag is disabled', async () => {
    const mockNotFoundResponse = { statusCode: 404 };
    (assertWorkflowsEnabled as jest.Mock).mockResolvedValueOnce(mockNotFoundResponse);

    const { registerGetActionTriggeredGenerationsRoute } = await import(
      './get_action_triggered_generations'
    );

    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerGetActionTriggeredGenerationsRoute(router, {} as never, {
      getEventLogIndex: jest.fn().mockResolvedValue('.kibana-event-log-test'),
      getStartServices: jest.fn().mockResolvedValue({ coreStart: {}, pluginsStart: {} }),
    });

    const handler = addVersionMock.mock.calls[0][1];
    const request = httpServerMock.createKibanaRequest({ query: {} });
    const response = httpServerMock.createResponseFactory();

    const result = await handler({}, request, response);

    expect(result).toEqual(mockNotFoundResponse);
    expect(response.ok).not.toHaveBeenCalled();
  });
});
