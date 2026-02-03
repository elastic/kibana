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
  let callRoute: (
    params: Record<string, string | string[]>,
    authz?: Record<string, boolean>
  ) => Promise<void>;
  let mockEndpointContext: EndpointAppContext;
  let router: SecuritySolutionPluginRouterMock;

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();
    mockEndpointContext = createMockEndpointAppContext();

    // @ts-expect-error write to readonly property
    mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = false;

    router = httpServiceMock.createRouter();
    registerGetInsightsRoute(router, mockEndpointContext);

    (
      mockEndpointContext.service.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);

    fetchMock.mockClear();

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

    describe('policy_response_failure feature flag validation', () => {
      it('should accept policy_response_failure types when feature flag is enabled', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = true;

        const mockInsights = [
          {
            _id: 1,
            _source: {
              type: 'policy_response_failure',
              name: 'Policy Response Failure Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({ types: ['policy_response_failure'] });

        expect(fetchMock).toHaveBeenCalledWith({ types: ['policy_response_failure'] });
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: [
            {
              id: 1,
              type: 'policy_response_failure',
              name: 'Policy Response Failure Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          ],
        });
      });

      it('should reject policy_response_failure types when feature flag is disabled', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = false;

        await callRoute({ types: ['policy_response_failure'] });

        expect(mockResponse.badRequest).toHaveBeenCalledWith({
          body: 'policy_response_failure insight type requires defendInsightsPolicyResponseFailure feature flag',
        });
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('should accept mixed types when feature flag is enabled', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = true;

        const mockInsights = [
          {
            _id: 1,
            _source: {
              type: 'incompatible_antivirus',
              name: 'Antivirus Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          },
          {
            _id: 2,
            _source: {
              type: 'policy_response_failure',
              name: 'Policy Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({ types: ['incompatible_antivirus', 'policy_response_failure'] });

        expect(fetchMock).toHaveBeenCalledWith({
          types: ['incompatible_antivirus', 'policy_response_failure'],
        });
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: [
            {
              id: 1,
              type: 'incompatible_antivirus',
              name: 'Antivirus Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
            {
              id: 2,
              type: 'policy_response_failure',
              name: 'Policy Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          ],
        });
      });

      it('should reject mixed types when feature flag is disabled and policy_response_failure is included', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = false;

        await callRoute({ types: ['incompatible_antivirus', 'policy_response_failure'] });

        expect(mockResponse.badRequest).toHaveBeenCalledWith({
          body: 'policy_response_failure insight type requires defendInsightsPolicyResponseFailure feature flag',
        });
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('should allow incompatible_antivirus types regardless of feature flag state', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = false;

        const mockInsights = [
          {
            _id: 1,
            _source: {
              type: 'incompatible_antivirus',
              name: 'Antivirus Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({ types: ['incompatible_antivirus'] });

        expect(fetchMock).toHaveBeenCalledWith({ types: ['incompatible_antivirus'] });
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: [
            {
              id: 1,
              type: 'incompatible_antivirus',
              name: 'Antivirus Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          ],
        });
      });

      it('should handle array format for types parameter with feature flag validation', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = true;

        const mockInsights = [
          {
            _id: 1,
            _source: {
              type: 'policy_response_failure',
              name: 'Policy Insight',
              target: { ids: ['agent-1'] },
              category: 'endpoint',
              message: 'Test message',
            },
          },
        ];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({ types: ['policy_response_failure'] });

        expect(fetchMock).toHaveBeenCalledWith({ types: ['policy_response_failure'] });
        expect(mockResponse.ok).toHaveBeenCalled();
      });

      it('should handle empty types parameter without feature flag validation', async () => {
        // @ts-expect-error write to readonly property
        mockEndpointContext.experimentalFeatures.defendInsightsPolicyResponseFailure = false;

        const mockInsights: Array<{ _id: number; _source: { type: string; name: string } }> = [];
        fetchMock.mockResolvedValue(mockInsights);

        await callRoute({ types: [] });

        expect(fetchMock).toHaveBeenCalledWith({ types: [] });
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: [],
        });
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
