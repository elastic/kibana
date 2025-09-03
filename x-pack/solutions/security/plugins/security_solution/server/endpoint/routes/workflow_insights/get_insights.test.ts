/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { registerGetInsightsRoute } from './get_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';
import { NotFoundError } from '../../errors';
import type { EndpointAppContext } from '../../types';
import type { SecuritySolutionPluginRouterMock } from '../../../mocks';

jest.mock('../../services', () => ({
  securityWorkflowInsightsService: {
    fetch: jest.fn(),
  },
}));

const fetchMock = jest.requireMock('../../services').securityWorkflowInsightsService
  .fetch as jest.Mock;

describe('Get Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let callRoute: (params: Record<string, string>, authz?: Record<string, boolean>) => Promise<void>;
  let mockEndpointContext: EndpointAppContext;
  let router: SecuritySolutionPluginRouterMock;

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();
    mockEndpointContext = createMockEndpointAppContext();
    router = httpServiceMock.createRouter();
    registerGetInsightsRoute(router, mockEndpointContext);

    (
      mockEndpointContext.service.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);

    callRoute = async (params, authz = { canReadWorkflowInsights: true }) => {
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
        path: WORKFLOW_INSIGHTS_ROUTE,
        query: params,
      });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        router,
        'get',
        WORKFLOW_INSIGHTS_ROUTE,
        '1'
      )!;
      await routeHandler(mockContext, request, mockResponse);
    };
  });

  describe('with valid privileges', () => {
    it('should fetch insights and return them', async () => {
      const mockInsights = [
        { _id: 1, _source: { name: 'Insight 1', target: { ids: ['agent-123', 'agent-456'] } } },
        { _id: 2, _source: { name: 'Insight 2', target: { ids: ['agent-123', 'agent-456'] } } },
      ];
      fetchMock.mockResolvedValue(mockInsights);

      await callRoute({ query: 'test-query' });

      expect(fetchMock).toHaveBeenCalledWith({ query: 'test-query' });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: [
          { id: 1, name: 'Insight 1', target: { ids: ['agent-123', 'agent-456'] } },
          { id: 2, name: 'Insight 2', target: { ids: ['agent-123', 'agent-456'] } },
        ],
      });
    });

    it('should handle missing query parameters', async () => {
      fetchMock.mockResolvedValue([]);

      await callRoute({});

      expect(fetchMock).toHaveBeenCalledWith({});
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: [],
      });
    });
    describe('with space awareness enabled', () => {
      const enableSpaceAwareness: () => {
        mockEnsureInCurrentSpace: jest.Mock;
      } = () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
        return {
          mockEnsureInCurrentSpace: mockEndpointContext.service.getInternalFleetServices()
            .ensureInCurrentSpace as jest.Mock,
        };
      };

      it('should call ensureInCurrentSpace when flag is enabled', async () => {
        const { mockEnsureInCurrentSpace } = enableSpaceAwareness();

        const mockInsights = [
          {
            _id: 'insight-1',
            _source: { name: 'Insight A', target: { ids: ['agent-123', 'agent-456'] } },
          },
          { _id: 'insight-2', _source: { name: 'Insight B', target: { ids: ['agent-123'] } } },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({});

        expect(mockEnsureInCurrentSpace).toHaveBeenCalledWith({
          agentIds: ['agent-123', 'agent-456'],
        });
      });

      it('should deduplicate agent IDs before calling ensureInCurrentSpace', async () => {
        const { mockEnsureInCurrentSpace } = enableSpaceAwareness();

        const mockInsights = [
          {
            _id: 'insight-1',
            _source: { name: 'A', target: { ids: ['agent-1', 'agent-2'] } },
          },
          {
            _id: 'insight-2',
            _source: { name: 'B', target: { ids: ['agent-1', 'agent-2', 'agent-3'] } },
          },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({});

        expect(mockEnsureInCurrentSpace).toHaveBeenCalledWith({
          agentIds: ['agent-1', 'agent-2', 'agent-3'], // no duplicates
        });
      });

      it('should return 404 if ensureInCurrentSpace throws NotFoundError', async () => {
        const { mockEnsureInCurrentSpace } = enableSpaceAwareness();

        mockEnsureInCurrentSpace.mockRejectedValue(new NotFoundError('agent not found'));

        const mockInsights = [
          {
            _id: 'insight-1',
            _source: { name: 'Test', target: { ids: ['agent-123'] } },
          },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({});

        expect(mockResponse.notFound).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.any(NotFoundError),
          })
        );
      });
    });
  });

  describe('with invalid privileges', () => {
    it('should return forbidden if user lacks read privileges', async () => {
      await callRoute({}, { canReadWorkflowInsights: false });

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
