/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { registerUpdateInsightsRoute } from './update_insight';
import { WORKFLOW_INSIGHTS_UPDATE_ROUTE } from '../../../../common/endpoint/constants';
import { NotFoundError } from '../../errors';
import type { EndpointAppContext } from '../../types';

jest.mock('../../services', () => ({
  securityWorkflowInsightsService: {
    update: jest.fn(),
    fetch: jest.fn(),
  },
}));

const updateMock = jest.requireMock('../../services').securityWorkflowInsightsService
  .update as jest.Mock;
const fetchMock = jest.requireMock('../../services').securityWorkflowInsightsService
  .fetch as jest.Mock;

const mockDefaultInsight = () => {
  fetchMock.mockResolvedValue([{ _id: '1', _index: 'index-123', _source: {} }]);
};

describe('Update Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;

  const callRoute = async (
    params: Record<string, string>,
    body: Record<string, unknown>,
    authz: Record<string, boolean> = {
      canWriteWorkflowInsights: true,
      canReadWorkflowInsights: true,
    },
    customContext?: Partial<EndpointAppContext>
  ) => {
    mockResponse = httpServerMock.createResponseFactory();

    const mockEndpointContext = createMockEndpointAppContext();
    const router = httpServiceMock.createRouter();

    const mockContext = {
      ...mockEndpointContext,
      ...customContext,
      service: {
        ...mockEndpointContext.service,
        getEndpointAuthz: jest.fn().mockResolvedValue(authz),
        getTelemetryService:
          customContext?.service?.getTelemetryService ??
          jest.fn().mockReturnValue({ reportEvent: jest.fn() }),
      },
      securitySolution: {
        getEndpointAuthz: jest.fn().mockResolvedValue(authz),
        getSpaceId: jest.fn().mockReturnValue('default'),
      },
      core: {
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ username: 'test-user', roles: ['admin'] }),
          },
        },
      },
    };

    registerUpdateInsightsRoute(router, mockContext as unknown as typeof mockEndpointContext);

    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: WORKFLOW_INSIGHTS_UPDATE_ROUTE,
      params,
      body,
    });

    const { routeHandler } = getRegisteredVersionedRouteMock(
      router,
      'put',
      WORKFLOW_INSIGHTS_UPDATE_ROUTE,
      '1'
    )!;
    await routeHandler(mockContext, request, mockResponse);
    return mockResponse;
  };

  describe('standard operations and authz', () => {
    it('should update insight and return the updated data', async () => {
      mockDefaultInsight();
      const mockUpdatedInsight = { id: 1, name: 'Updated Insight', type: 'incompatible_antivirus' };
      updateMock.mockResolvedValue(mockUpdatedInsight);

      const updateBody = { name: 'Updated Insight' };

      await callRoute({ insightId: '1' }, updateBody);

      expect(updateMock).toHaveBeenCalledWith('1', updateBody, 'index-123');
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: mockUpdatedInsight,
      });
    });

    it('should handle missing body parameters', async () => {
      mockDefaultInsight();
      updateMock.mockResolvedValue({ id: 1, name: 'Insight 1' });

      const updateBody = {}; // Empty body to test missing parameters

      await callRoute({ insightId: '1' }, updateBody);

      expect(updateMock).toHaveBeenCalledWith('1', {}, 'index-123');
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { id: 1, name: 'Insight 1' },
      });
    });

    it('should return forbidden if user lacks write and read privileges', async () => {
      mockDefaultInsight();
      await callRoute(
        { insightId: '1' },
        { action: { type: 'remediated' } },
        { canWriteWorkflowInsights: false, canReadWorkflowInsights: false }
      );

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });

    it('should allow update if user has no write privileges but read and the body only contains action.type', async () => {
      mockDefaultInsight();
      const updateBody = { action: { type: 'remediated' } }; // Only action.type in the body
      updateMock.mockResolvedValue({ id: 1, ...updateBody });
      await callRoute({ insightId: '1' }, updateBody, {
        canWriteWorkflowInsights: false,
        canReadWorkflowInsights: true,
      });

      expect(updateMock).toHaveBeenCalledWith('1', updateBody, 'index-123');
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { id: 1, action: { type: 'remediated' } },
      });
    });

    it('should return forbidden if user has no write privileges but read and the body contains more than action.type', async () => {
      mockDefaultInsight();
      const updateBody = { action: { type: 'remediated' }, value: 'changeme' };
      await callRoute({ insightId: '1' }, updateBody, {
        canWriteWorkflowInsights: false,
        canReadWorkflowInsights: true,
      });

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });

    it('should report telemetry when action.type is remediated', async () => {
      const reportEventMock = jest.fn();
      const mockEndpointContext = createMockEndpointAppContext();
      mockEndpointContext.service.getTelemetryService = jest.fn().mockReturnValue({
        reportEvent: reportEventMock,
      });

      fetchMock.mockResolvedValue([{ _id: '1', _index: 'index-123', _source: {} }]);
      updateMock.mockResolvedValue({ id: 1 });

      await callRoute(
        { insightId: '1' },
        { action: { type: 'remediated' } },
        {
          canWriteWorkflowInsights: false,
          canReadWorkflowInsights: true,
        },
        mockEndpointContext
      );

      expect(reportEventMock).toHaveBeenCalledWith('endpoint_workflow_insights_remediated_event', {
        insightId: '1',
      });
    });

    it('should throw if retrieved insight is missing', async () => {
      const mockEndpointContext = createMockEndpointAppContext();
      fetchMock.mockResolvedValue([]); // Simulate not found
      await callRoute({ insightId: 'nope' }, { name: 'test' }, undefined, mockEndpointContext);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: expect.objectContaining({
          message: expect.stringContaining('Failed to retrieve insight'),
        }),
      });
    });
  });

  describe('space awareness', () => {
    const setupTest = () => {
      const mockEndpointContext = createMockEndpointAppContext();
      // @ts-expect-error
      mockEndpointContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
      return mockEndpointContext;
    };

    const callWithCustomContext = async (
      context: EndpointAppContext,
      body: Record<string, unknown>
    ) => {
      const router = httpServiceMock.createRouter();
      const localMockResponse = httpServerMock.createResponseFactory();

      registerUpdateInsightsRoute(router, context);

      const request = httpServerMock.createKibanaRequest({
        method: 'put',
        path: WORKFLOW_INSIGHTS_UPDATE_ROUTE,
        params: { insightId: '1' },
        body,
      });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        router,
        'put',
        WORKFLOW_INSIGHTS_UPDATE_ROUTE,
        '1'
      )!;

      const mockContext = {
        ...context,
        service: {
          ...context.service,
          getEndpointAuthz: jest.fn().mockResolvedValue({
            canWriteWorkflowInsights: true,
            canReadWorkflowInsights: true,
          }),
          getTelemetryService: jest.fn().mockReturnValue({ reportEvent: jest.fn() }),
        },
        securitySolution: {
          getSpaceId: jest.fn().mockReturnValue('default'),
          getEndpointAuthz: jest.fn().mockResolvedValue({
            canWriteWorkflowInsights: true,
            canReadWorkflowInsights: true,
          }),
        },
        core: {
          security: {
            authc: {
              getCurrentUser: jest
                .fn()
                .mockReturnValue({ username: 'test-user', roles: ['admin'] }),
            },
          },
        },
      };

      await routeHandler(mockContext, request, localMockResponse);
      return localMockResponse;
    };

    it('combines agent IDs from request body and retrieved insight for ensureInCurrentSpace', async () => {
      const context = setupTest();
      const mockEnsure = jest.fn();
      context.service.getInternalFleetServices = jest
        .fn()
        .mockReturnValue({ ensureInCurrentSpace: mockEnsure });

      fetchMock.mockResolvedValue([
        { _id: '1', _index: 'index-1', _source: { target: { ids: ['b', 'c'] } } },
      ]);
      updateMock.mockResolvedValue({ id: 1 });

      const response = await callWithCustomContext(context, {
        target: { ids: ['a', 'b'] },
      });

      expect(mockEnsure).toHaveBeenCalledWith({
        agentIds: expect.arrayContaining(['a', 'b', 'c']),
      });
      expect(response.ok).toHaveBeenCalled();
    });

    it('calls ensureInCurrentSpace with deduplicated agent IDs from request body', async () => {
      const context = setupTest();
      const mockEnsure = jest.fn();
      context.service.getInternalFleetServices = jest
        .fn()
        .mockReturnValue({ ensureInCurrentSpace: mockEnsure });

      fetchMock.mockResolvedValue([{ _id: '1', _index: 'index-1', _source: {} }]);
      updateMock.mockResolvedValue({ id: 1 });

      const response = await callWithCustomContext(context, {
        target: { ids: ['a', 'b', 'a'] },
      });

      expect(mockEnsure).toHaveBeenCalledWith({ agentIds: ['a', 'b'] });
      expect(response.ok).toHaveBeenCalled();
    });

    it('uses agent IDs from fetched insight if not in request body', async () => {
      const context = setupTest();
      const mockEnsure = jest.fn();
      context.service.getInternalFleetServices = jest
        .fn()
        .mockReturnValue({ ensureInCurrentSpace: mockEnsure });

      fetchMock.mockResolvedValue([
        { _id: '1', _index: 'index-1', _source: { target: { ids: ['x', 'y'] } } },
      ]);
      updateMock.mockResolvedValue({ id: 1 });

      const response = await callWithCustomContext(context, { name: 'update' });

      expect(mockEnsure).toHaveBeenCalledWith({ agentIds: ['x', 'y'] });
      expect(response.ok).toHaveBeenCalled();
    });

    it('returns 404 if ensureInCurrentSpace throws NotFoundError', async () => {
      const context = setupTest();
      context.service.getInternalFleetServices = jest.fn().mockReturnValue({
        ensureInCurrentSpace: jest.fn().mockRejectedValue(new NotFoundError('not found')),
      });

      fetchMock.mockResolvedValue([
        { _id: '1', _index: 'index-1', _source: { target: { ids: ['x'] } } },
      ]);

      const response = await callWithCustomContext(context, { name: 'bad update' });

      expect(response.notFound).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(NotFoundError) })
      );
    });

    it('skips ensureInCurrentSpace if agent IDs are missing from both body and retrieved insight', async () => {
      const context = setupTest();
      const mockEnsure = jest.fn();
      context.service.getInternalFleetServices = jest
        .fn()
        .mockReturnValue({ ensureInCurrentSpace: mockEnsure });

      fetchMock.mockResolvedValue([{ _id: '1', _index: 'index-1', _source: {} }]);
      updateMock.mockResolvedValue({ id: 1 });

      const response = await callWithCustomContext(context, { name: 'noop update' });

      expect(mockEnsure).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });

    it('skips ensureInCurrentSpace if space awareness is disabled', async () => {
      const context = createMockEndpointAppContext();
      fetchMock.mockResolvedValue([{ _id: '1', _index: 'index-1', _source: {} }]);
      updateMock.mockResolvedValue({ id: 1 });

      const mockEnsure = jest.fn();
      context.service.getInternalFleetServices = jest
        .fn()
        .mockReturnValue({ ensureInCurrentSpace: mockEnsure });

      const response = await callWithCustomContext(context, { name: 'no space awareness' });

      expect(mockEnsure).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });
  });
});
