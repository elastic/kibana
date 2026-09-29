/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { registerGetPendingRoute } from './get_pending';
import { WORKFLOW_INSIGHTS_PENDING_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';
import type { SecuritySolutionPluginRouterMock } from '../../../mocks';
import { AUTOMATIC_TROUBLESHOOTING_TAG } from '.';

describe('Get Pending Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let callRoute: (
    query?: Record<string, unknown>,
    authz?: Record<string, boolean>
  ) => Promise<void>;
  let mockEndpointContext: EndpointAppContext;
  let router: SecuritySolutionPluginRouterMock;
  let mockAgentBuilder: {
    execution: {
      findExecutions: jest.Mock;
    };
  };

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();
    mockEndpointContext = createMockEndpointAppContext();

    // @ts-expect-error write to readonly property
    mockEndpointContext.experimentalFeatures.automaticTroubleshootingSkill = true;

    mockAgentBuilder = {
      execution: {
        findExecutions: jest.fn().mockResolvedValue([]),
      },
    };
    (mockEndpointContext.service.getAgentBuilder as jest.Mock).mockReturnValue(mockAgentBuilder);

    router = httpServiceMock.createRouter();
    registerGetPendingRoute(router, mockEndpointContext);

    callRoute = async (query = {}, authz = { canReadWorkflowInsights: true }) => {
      const mockContext = {
        core: {
          security: {
            authc: {
              getCurrentUser: jest
                .fn()
                .mockReturnValue({ username: 'test-user', roles: ['admin'] }),
            },
          },
        },
        securitySolution: {
          getEndpointAuthz: jest.fn().mockResolvedValue(authz),
          getSpaceId: jest.fn().mockReturnValue('default'),
        },
      };

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: WORKFLOW_INSIGHTS_PENDING_ROUTE,
        query,
      });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        router,
        'get',
        WORKFLOW_INSIGHTS_PENDING_ROUTE,
        '1'
      );
      await routeHandler(mockContext, request, mockResponse);
    };
  });

  describe('feature flag gating', () => {
    it('returns 400 when automaticTroubleshootingSkill is disabled', async () => {
      // @ts-expect-error write to readonly property
      mockEndpointContext.experimentalFeatures.automaticTroubleshootingSkill = false;

      await callRoute();

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: 'automaticTroubleshootingSkill feature flag is disabled',
      });
    });
  });

  describe('no pending executions', () => {
    it('returns empty pending array when findExecutions returns no results', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([]);

      await callRoute();

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { pending: [] } });
    });
  });

  describe('status filter (exact combo — both arrays supplied)', () => {
    it('filters for running, scheduled, failed, aborted, and completed statuses', async () => {
      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            status: [
              ExecutionStatus.running,
              ExecutionStatus.scheduled,
              ExecutionStatus.failed,
              ExecutionStatus.aborted,
              ExecutionStatus.completed,
            ],
          }),
        })
      );
    });
  });

  describe('query size and sort (exact combo — both arrays supplied)', () => {
    it('requests size 1 and an explicit `@timestamp desc` sort for a single-combo query', async () => {
      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledTimes(1);
      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          size: 1,
          sort: { field: '@timestamp', order: 'desc' },
        })
      );
    });

    it('requests size 1 and explicit `@timestamp desc` sort for every query in a multi-combo fan-out', async () => {
      await callRoute({
        insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        endpointIds: ['endpoint-1'],
      });

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledTimes(2);
      for (const call of mockAgentBuilder.execution.findExecutions.mock.calls) {
        expect(call[1]).toEqual(
          expect.objectContaining({
            size: 1,
            sort: { field: '@timestamp', order: 'desc' },
          })
        );
      }
    });
  });

  describe('latest-per-combo semantics', () => {
    const makeExecution = (overrides: Record<string, unknown>) => ({
      executionId: 'exec',
      status: ExecutionStatus.running,
      metadata: {
        insightType: 'incompatible_antivirus',
        source: AUTOMATIC_TROUBLESHOOTING_TAG,
        endpointId: 'endpoint-1',
      },
      '@timestamp': '2024-01-01T00:00:00Z',
      agentId: 'agent-1',
      executionMode: AgentExecutionMode.conversation,
      spaceId: 'default',
      agentParams: { conversationId: 'conv-1' },
      eventCount: 0,
      events: [],
      ...overrides,
    });

    it('omits a latest completed execution from the response', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        makeExecution({ executionId: 'exec-completed', status: ExecutionStatus.completed }),
      ]);

      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { pending: [] } });
    });

    it('returns a latest failed execution with its failureReason', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        makeExecution({
          executionId: 'exec-failed',
          status: ExecutionStatus.failed,
          error: { message: 'connector timed out' },
        }),
      ]);

      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(1);
      expect(callBody.pending[0].status).toBe(ExecutionStatus.failed);
      expect(callBody.pending[0].failureReason).toBe('connector timed out');
    });

    it('returns a latest aborted execution', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        makeExecution({ executionId: 'exec-aborted', status: ExecutionStatus.aborted }),
      ]);

      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(1);
      expect(callBody.pending[0].status).toBe(ExecutionStatus.aborted);
    });

    it('returns a latest active (running) execution', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        makeExecution({ executionId: 'exec-running', status: ExecutionStatus.running }),
      ]);

      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(1);
      expect(callBody.pending[0].status).toBe(ExecutionStatus.running);
    });

    it('returns only the actionable combo when one latest is completed and the other failed', async () => {
      mockAgentBuilder.execution.findExecutions
        .mockResolvedValueOnce([
          makeExecution({
            executionId: 'exec-completed',
            status: ExecutionStatus.completed,
            metadata: {
              insightType: 'incompatible_antivirus',
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
              endpointId: 'endpoint-1',
            },
          }),
        ])
        .mockResolvedValueOnce([
          makeExecution({
            executionId: 'exec-failed',
            status: ExecutionStatus.failed,
            error: { message: 'boom' },
            metadata: {
              insightType: 'policy_response_failure',
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
              endpointId: 'endpoint-1',
            },
          }),
        ]);

      await callRoute({
        insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        endpointIds: ['endpoint-1'],
      });

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(1);
      expect(callBody.pending[0].executionId).toBe('exec-failed');
      expect(callBody.pending[0].insightType).toBe('policy_response_failure');
    });

    it('returns empty when a historical failure has been superseded by a latest completed run', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        makeExecution({ executionId: 'exec-latest-completed', status: ExecutionStatus.completed }),
      ]);

      await callRoute({ insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] });

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: { pending: [] } });
    });
  });

  describe('broad queries (partial or no filters) preserve size:100 and exclude completed', () => {
    const broadShapes: Array<[string, Record<string, unknown>]> = [
      ['only insightTypes', { insightTypes: ['incompatible_antivirus'] }],
      ['only endpointIds', { endpointIds: ['endpoint-1'] }],
      ['neither filter', {}],
    ];

    it.each(broadShapes)(
      'requests size 100 without an explicit sort for %s',
      async (_label, query) => {
        await callRoute(query);

        for (const call of mockAgentBuilder.execution.findExecutions.mock.calls) {
          expect(call[1]).toEqual(expect.objectContaining({ size: 100 }));
          expect(call[1]).not.toHaveProperty('sort');
        }
      }
    );

    it.each(broadShapes)(
      'excludes completed from the status filter for %s',
      async (_label, query) => {
        await callRoute(query);

        for (const call of mockAgentBuilder.execution.findExecutions.mock.calls) {
          expect(call[1].filter.status).toEqual([
            ExecutionStatus.running,
            ExecutionStatus.scheduled,
            ExecutionStatus.failed,
            ExecutionStatus.aborted,
          ]);
          expect(call[1].filter.status).not.toContain(ExecutionStatus.completed);
        }
      }
    );

    it('returns multiple actionable executions for a broad query (no size:1 truncation)', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'exec-running',
          status: ExecutionStatus.running,
          metadata: {
            insightType: 'incompatible_antivirus',
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            endpointId: 'endpoint-1',
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
          executionMode: AgentExecutionMode.conversation,
          spaceId: 'default',
          agentParams: { conversationId: 'conv-1' },
          eventCount: 0,
          events: [],
        },
        {
          executionId: 'exec-failed',
          status: ExecutionStatus.failed,
          metadata: {
            insightType: 'incompatible_antivirus',
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            endpointId: 'endpoint-2',
          },
          '@timestamp': '2024-01-01T00:00:01Z',
          agentId: 'agent-2',
          executionMode: AgentExecutionMode.conversation,
          spaceId: 'default',
          agentParams: {},
          eventCount: 0,
          events: [],
          error: { message: 'boom' },
        },
      ]);

      await callRoute({ insightTypes: ['incompatible_antivirus'] });

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(2);
      expect(callBody.pending.map((p: { executionId: string }) => p.executionId)).toEqual([
        'exec-running',
        'exec-failed',
      ]);
    });
  });

  describe('insightTypes filter', () => {
    it('includes insightType in metadata filter when a single insightTypes query param is provided', async () => {
      await callRoute({ insightTypes: ['incompatible_antivirus'] });

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            metadata: expect.objectContaining({
              insightType: 'incompatible_antivirus',
            }),
          }),
        })
      );
    });

    it('issues one findExecutions call per insightType when multiple insightTypes are provided', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await callRoute({
        insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
      });

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledTimes(2);
      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            metadata: expect.objectContaining({
              insightType: 'incompatible_antivirus',
            }),
          }),
        })
      );
      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            metadata: expect.objectContaining({
              insightType: 'policy_response_failure',
            }),
          }),
        })
      );
    });

    it('omits insightType from metadata filter when query param is absent', async () => {
      await callRoute({});

      const filterMetadata =
        mockAgentBuilder.execution.findExecutions.mock.calls[0][1].filter.metadata;
      expect(filterMetadata).not.toHaveProperty('insightType');
    });
  });

  describe('endpointIds filter', () => {
    it('issues one findExecutions call per endpointId when endpointIds is provided', async () => {
      mockAgentBuilder.execution.findExecutions
        .mockResolvedValueOnce([
          {
            executionId: 'exec-1',
            status: ExecutionStatus.running,
            metadata: {
              insightType: 'incompatible_antivirus',
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
              endpointId: 'endpoint-1',
            },
            '@timestamp': '2024-01-01T00:00:00Z',
            agentId: 'agent-1',
            executionMode: AgentExecutionMode.conversation,
            spaceId: 'default',
            agentParams: { conversationId: 'conv-1' },
            eventCount: 0,
            events: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            executionId: 'exec-2',
            status: ExecutionStatus.scheduled,
            metadata: {
              insightType: 'policy_response_failure',
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
              endpointId: 'endpoint-2',
            },
            '@timestamp': '2024-01-01T00:00:01Z',
            agentId: 'agent-2',
            executionMode: AgentExecutionMode.conversation,
            spaceId: 'default',
            agentParams: { conversationId: 'conv-2' },
            eventCount: 0,
            events: [],
          },
        ]);

      await callRoute({ endpointIds: ['endpoint-1', 'endpoint-2'] });

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledTimes(2);
      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            metadata: expect.objectContaining({ endpointId: 'endpoint-1' }),
          }),
        })
      );
      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            metadata: expect.objectContaining({ endpointId: 'endpoint-2' }),
          }),
        })
      );

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(2);
    });

    it('deduplicates results when the same executionId is returned for multiple endpointId calls', async () => {
      const sharedExecution = {
        executionId: 'exec-shared',
        status: ExecutionStatus.running,
        metadata: {
          insightType: 'incompatible_antivirus',
          source: AUTOMATIC_TROUBLESHOOTING_TAG,
          endpointId: 'endpoint-1',
        },
        '@timestamp': '2024-01-01T00:00:00Z',
        agentId: 'agent-1',
        executionMode: AgentExecutionMode.conversation,
        spaceId: 'default',
        agentParams: { conversationId: 'conv-1' },
        eventCount: 0,
        events: [],
      };

      mockAgentBuilder.execution.findExecutions
        .mockResolvedValueOnce([sharedExecution])
        .mockResolvedValueOnce([sharedExecution]);

      await callRoute({ endpointIds: ['endpoint-1', 'endpoint-2'] });

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending).toHaveLength(1);
    });
  });

  describe('happy path', () => {
    it('returns mapped pending executions with correct shape including endpointId', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'exec-1',
          status: ExecutionStatus.running,
          metadata: {
            insightType: 'incompatible_antivirus',
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            endpointId: 'endpoint-1',
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
          executionMode: AgentExecutionMode.conversation,
          spaceId: 'default',
          agentParams: { conversationId: 'conv-1' },
          eventCount: 0,
          events: [],
        },
      ]);

      await callRoute();

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          pending: [
            {
              executionId: 'exec-1',
              status: ExecutionStatus.running,
              conversationId: 'conv-1',
              insightType: 'incompatible_antivirus',
              endpointId: 'endpoint-1',
              '@timestamp': '2024-01-01T00:00:00Z',
            },
          ],
        },
      });
    });

    it('includes failed and aborted executions in response', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'exec-failed',
          status: ExecutionStatus.failed,
          metadata: {
            insightType: 'policy_response_failure',
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            endpointId: 'endpoint-1',
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
          executionMode: AgentExecutionMode.conversation,
          spaceId: 'default',
          agentParams: {},
          eventCount: 0,
          events: [],
        },
      ]);

      await callRoute();

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.pending[0].status).toBe(ExecutionStatus.failed);
    });

    it('always includes source in metadata filter', async () => {
      await callRoute();

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            metadata: expect.objectContaining({
              source: AUTOMATIC_TROUBLESHOOTING_TAG,
            }),
          }),
        })
      );
    });
  });

  describe('authorization', () => {
    it('returns forbidden when user lacks canReadWorkflowInsights', async () => {
      await callRoute({}, { canReadWorkflowInsights: false });

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
