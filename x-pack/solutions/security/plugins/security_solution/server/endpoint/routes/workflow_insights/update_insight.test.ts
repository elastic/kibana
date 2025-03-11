/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { registerUpdateInsightsRoute } from './update_insight';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { WORKFLOW_INSIGHTS_UPDATE_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContext } from '../../types';

jest.mock('../../services', () => ({
  securityWorkflowInsightsService: {
    update: jest.fn(),
  },
}));

const updateMock = jest.requireMock('../../services').securityWorkflowInsightsService
  .update as jest.Mock;

describe('Update Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;

  const callRoute = async (
    params: Record<string, string>,
    body: Record<string, unknown>,
    authz: Record<string, boolean> = {
      canWriteWorkflowInsights: true,
      canReadWorkflowInsights: true,
    }
  ) => {
    mockResponse = httpServerMock.createResponseFactory();

    const mockEndpointContext = createMockEndpointAppContext();
    const router = httpServiceMock.createRouter();

    const mockContext = {
      ...mockEndpointContext,
      service: {
        ...mockEndpointContext.service,
        getEndpointAuthz: jest.fn().mockResolvedValue(authz),
      },
      securitySolution: {
        getEndpointAuthz: jest.fn().mockResolvedValue(authz),
      },
      core: {
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ username: 'test-user', roles: ['admin'] }),
          },
        },
      },
    };

    registerUpdateInsightsRoute(router, mockContext as unknown as EndpointAppContext);

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
  };

  describe('with valid privileges', () => {
    it('should update insight and return the updated data', async () => {
      const mockUpdatedInsight = { id: 1, name: 'Updated Insight', type: 'incompatible_antivirus' };
      updateMock.mockResolvedValue(mockUpdatedInsight);

      const updateBody = { name: 'Updated Insight' };

      await callRoute({ insightId: '1' }, updateBody);

      expect(updateMock).toHaveBeenCalledWith('1', updateBody);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: mockUpdatedInsight,
      });
    });

    it('should handle missing body parameters', async () => {
      updateMock.mockResolvedValue({ id: 1, name: 'Insight 1' });

      const updateBody = {}; // Empty body to test missing parameters

      await callRoute({ insightId: '1' }, updateBody);

      expect(updateMock).toHaveBeenCalledWith('1', {});
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { id: 1, name: 'Insight 1' },
      });
    });
  });

  describe('with invalid privileges', () => {
    it('should return forbidden if user lacks write and read privileges', async () => {
      await callRoute(
        { insightId: '1' },
        { action: { type: 'remediated' } },
        { canWriteWorkflowInsights: false, canReadWorkflowInsights: false }
      );

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });

    it('should allow update if user has no write privileges but read and the body only contains action.type', async () => {
      const updateBody = { action: { type: 'remediated' } }; // Only action.type in the body
      updateMock.mockResolvedValue({ id: 1, ...updateBody });
      await callRoute({ insightId: '1' }, updateBody, {
        canWriteWorkflowInsights: false,
        canReadWorkflowInsights: true,
      });

      expect(updateMock).toHaveBeenCalledWith('1', updateBody);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { id: 1, action: { type: 'remediated' } },
      });
    });

    it('should return forbidden if user has no write privileges but read and the body contains more than action.type', async () => {
      const updateBody = { action: { type: 'remediated' }, value: 'changeme' };
      await callRoute({ insightId: '1' }, updateBody, {
        canWriteWorkflowInsights: false,
        canReadWorkflowInsights: true,
      });

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
