/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { EMPTY } from 'rxjs';
import { ExecutionStatus } from '@kbn/agent-builder-plugin/server';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { registerCreateInsightsRoute } from './create_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';
import type { SecuritySolutionPluginRouterMock } from '../../../mocks';
import { AUTOMATIC_TROUBLESHOOTING_TAG } from '.';

describe('Create Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let callRoute: (body: Record<string, unknown>, authz?: Record<string, boolean>) => Promise<void>;
  let mockEndpointContext: EndpointAppContext;
  let router: SecuritySolutionPluginRouterMock;
  let mockAgentBuilder: {
    execution: {
      executeAgent: jest.Mock;
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
        executeAgent: jest.fn().mockResolvedValue({ executionId: 'mock-exec-id', events$: EMPTY }),
        findExecutions: jest.fn().mockResolvedValue([]),
      },
    };
    (mockEndpointContext.service.getAgentBuilder as jest.Mock).mockReturnValue(mockAgentBuilder);

    router = httpServiceMock.createRouter();
    registerCreateInsightsRoute(router, mockEndpointContext);

    callRoute = async (body, authz = { canWriteWorkflowInsights: true }) => {
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
        method: 'post',
        path: WORKFLOW_INSIGHTS_ROUTE,
        body,
      });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        router,
        'post',
        WORKFLOW_INSIGHTS_ROUTE,
        '1'
      );
      await routeHandler(mockContext, request, mockResponse);
    };
  });

  describe('feature flag gating', () => {
    it('returns 400 when automaticTroubleshootingSkill is disabled', async () => {
      // @ts-expect-error write to readonly property
      mockEndpointContext.experimentalFeatures.automaticTroubleshootingSkill = false;

      await callRoute({
        insightTypes: ['incompatible_antivirus'],
        endpointIds: ['endpoint-1'],
      });

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: 'automaticTroubleshootingSkill feature flag is disabled',
      });
    });
  });

  describe('in-flight deduplication', () => {
    it('returns existing execution and skips creating a new one when combo is already running', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'existing-exec-id',
          status: ExecutionStatus.running,
          metadata: {
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            insightType: 'incompatible_antivirus',
            endpointId: 'endpoint-1',
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
          spaceId: 'default',
          agentParams: { conversationId: 'existing-conv-id' },
          eventCount: 0,
          events: [],
        },
      ]);

      await callRoute({
        insightTypes: ['incompatible_antivirus'],
        endpointIds: ['endpoint-1'],
      });

      expect(mockAgentBuilder.execution.executeAgent).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          executions: [
            expect.objectContaining({
              executionId: 'existing-exec-id',
              conversationId: 'existing-conv-id',
              insightType: 'incompatible_antivirus',
              endpointId: 'endpoint-1',
            }),
          ],
        },
      });
    });

    it('creates new execution for combos not already in-flight', async () => {
      // only incompatible_antivirus is running; policy_response_failure is not
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'existing-exec-id',
          status: ExecutionStatus.running,
          metadata: {
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            insightType: 'incompatible_antivirus',
            endpointId: 'endpoint-1',
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
          spaceId: 'default',
          agentParams: { conversationId: 'existing-conv-id' },
          eventCount: 0,
          events: [],
        },
      ]);

      await callRoute({
        insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        endpointIds: ['endpoint-1'],
      });

      // Only policy_response_failure should be created
      expect(mockAgentBuilder.execution.executeAgent).toHaveBeenCalledTimes(1);
      expect(mockAgentBuilder.execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            insightType: 'policy_response_failure',
            endpointId: 'endpoint-1',
          }),
        })
      );

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.executions).toHaveLength(2);
      expect(callBody.executions[0].executionId).toBe('existing-exec-id');
      expect(callBody.executions[1].executionId).toBe('mock-exec-id');
    });
  });

  describe('happy path', () => {
    it('calls executeAgent per insightType/endpointId combo and returns executions array', async () => {
      await callRoute({
        insightTypes: ['incompatible_antivirus'],
        endpointIds: ['endpoint-1'],
      });

      expect(mockAgentBuilder.execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            insightType: 'incompatible_antivirus',
            endpointId: 'endpoint-1',
          }),
          params: expect.objectContaining({
            autoCreateConversationWithId: true,
          }),
        })
      );

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.executions).toHaveLength(1);
      expect(callBody.executions[0]).toMatchObject({
        executionId: 'mock-exec-id',
        insightType: 'incompatible_antivirus',
        endpointId: 'endpoint-1',
      });
      expect(callBody.executions[0].conversationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('creates N×M executions for multiple insightTypes and endpointIds', async () => {
      mockAgentBuilder.execution.executeAgent
        .mockResolvedValueOnce({ executionId: 'exec-1', events$: EMPTY })
        .mockResolvedValueOnce({ executionId: 'exec-2', events$: EMPTY })
        .mockResolvedValueOnce({ executionId: 'exec-3', events$: EMPTY })
        .mockResolvedValueOnce({ executionId: 'exec-4', events$: EMPTY });

      await callRoute({
        insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        endpointIds: ['endpoint-1', 'endpoint-2'],
      });

      expect(mockAgentBuilder.execution.executeAgent).toHaveBeenCalledTimes(4);

      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.executions).toHaveLength(4);
    });

    it('uses generatePrompt — message contains endpointId', async () => {
      await callRoute({
        insightTypes: ['incompatible_antivirus'],
        endpointIds: ['my-endpoint-abc'],
      });

      const params = mockAgentBuilder.execution.executeAgent.mock.calls[0][0];
      expect(params.params.nextInput.message).toContain('my-endpoint-abc');
    });

    it('passes connectorId to executeAgent when provided', async () => {
      await callRoute({
        insightTypes: ['incompatible_antivirus'],
        endpointIds: ['endpoint-1'],
        connectorId: 'my-connector-id',
      });

      expect(mockAgentBuilder.execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            connectorId: 'my-connector-id',
          }),
        })
      );
    });

    it('omits connectorId from executeAgent params when not provided', async () => {
      await callRoute({
        insightTypes: ['incompatible_antivirus'],
        endpointIds: ['endpoint-1'],
      });

      const params = mockAgentBuilder.execution.executeAgent.mock.calls[0][0];
      expect(params.params).not.toHaveProperty('connectorId');
    });
  });

  describe('partial failure handling', () => {
    it('returns successful executions and skips failed ones without aborting the request', async () => {
      mockAgentBuilder.execution.executeAgent
        .mockResolvedValueOnce({ executionId: 'exec-1', events$: EMPTY })
        .mockRejectedValueOnce(new Error('connector not configured'));

      await callRoute({
        insightTypes: ['incompatible_antivirus', 'policy_response_failure'],
        endpointIds: ['endpoint-1'],
      });

      // Should still return 200 with the one successful execution
      expect(mockResponse.ok).toHaveBeenCalled();
      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.executions).toHaveLength(1);
      expect(callBody.executions[0].executionId).toBe('exec-1');

      // Should include the failure with the error message
      expect(callBody.failures).toHaveLength(1);
      expect(callBody.failures[0]).toMatchObject({
        insightType: 'policy_response_failure',
        endpointId: 'endpoint-1',
        error: 'connector not configured',
      });
    });
  });

  describe('authorization', () => {
    it('returns forbidden when user lacks canWriteWorkflowInsights', async () => {
      await callRoute(
        { insightTypes: ['incompatible_antivirus'], endpointIds: ['endpoint-1'] },
        { canWriteWorkflowInsights: false }
      );

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
