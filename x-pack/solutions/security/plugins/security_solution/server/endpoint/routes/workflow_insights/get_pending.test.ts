/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/agent-builder-plugin/server';
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

  describe('insightType filter', () => {
    it('includes insightType in metadata filter when query param is provided', async () => {
      await callRoute({ insightType: 'incompatible_antivirus' });

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

    it('omits insightType from metadata filter when query param is absent', async () => {
      await callRoute({});

      const filterMetadata =
        mockAgentBuilder.execution.findExecutions.mock.calls[0][1].filter.metadata;
      expect(filterMetadata).not.toHaveProperty('insightType');
    });
  });

  describe('happy path', () => {
    it('returns mapped pending executions with correct shape', async () => {
      mockAgentBuilder.execution.findExecutions.mockResolvedValue([
        {
          executionId: 'exec-1',
          status: ExecutionStatus.running,
          metadata: {
            insightType: 'incompatible_antivirus',
            source: AUTOMATIC_TROUBLESHOOTING_TAG,
          },
          '@timestamp': '2024-01-01T00:00:00Z',
          agentId: 'agent-1',
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
              '@timestamp': '2024-01-01T00:00:00Z',
            },
          ],
        },
      });
    });

    it('filters for running and scheduled statuses', async () => {
      await callRoute();

      expect(mockAgentBuilder.execution.findExecutions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({
            status: [ExecutionStatus.running, ExecutionStatus.scheduled],
          }),
        })
      );
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
