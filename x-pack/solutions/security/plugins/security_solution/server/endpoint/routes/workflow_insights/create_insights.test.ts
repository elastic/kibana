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

      await callRoute({ insightType: 'incompatible_antivirus' });

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: 'automaticTroubleshootingSkill feature flag is disabled',
      });
    });
  });

  describe('in-flight check', () => {
    it('returns existing session when a running execution already exists', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'existing-exec-id',
          status: ExecutionStatus.running,
          metadata: {
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            insightType: 'incompatible_antivirus',
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
          spaceId: 'default',
          agentParams: { conversationId: 'existing-conv-id' },
          eventCount: 0,
          events: [],
        },
      ]);

      await callRoute({ insightType: 'incompatible_antivirus' });

      expect(mockAgentBuilder.execution.executeAgent).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          executionId: 'existing-exec-id',
          conversationId: 'existing-conv-id',
        },
      });
    });
  });

  describe('happy path', () => {
    it('calls executeAgent with correct metadata and returns executionId + conversationId', async () => {
      await callRoute({ insightType: 'incompatible_antivirus' });

      expect(mockAgentBuilder.execution.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
            insightType: 'incompatible_antivirus',
          }),
          params: expect.objectContaining({
            autoCreateConversationWithId: true,
          }),
        })
      );

      expect(mockResponse.ok).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            executionId: 'mock-exec-id',
          }),
        })
      );

      // conversationId should be a UUID string
      const callBody = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
      expect(callBody.conversationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('authorization', () => {
    it('returns forbidden when user lacks canWriteWorkflowInsights', async () => {
      await callRoute(
        { insightType: 'incompatible_antivirus' },
        { canWriteWorkflowInsights: false }
      );

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
