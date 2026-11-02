/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { APP_ID } from '../../../../../common';
import { disableLeadGenerationRoute } from './disable_lead_generation';
import { DISABLE_LEAD_GENERATION_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockRemoveTask = jest.fn();
jest.mock('../tasks', () => ({
  removeLeadGenerationTask: (...args: unknown[]) => mockRemoveTask(...args),
}));

describe('disableLeadGenerationRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  const logger = loggingSystemMock.createLogger();
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    context = requestContextMock.convertContext(requestContextMock.create({ ...clients }));
    mockTaskManagerStart = taskManagerMock.createStart();
    getStartServicesMock = jest.fn().mockResolvedValue([{}, { taskManager: mockTaskManagerStart }]);
    disableLeadGenerationRoute(server.router, logger, getStartServicesMock);
  });

  describe('route security config', () => {
    it('declares the required Kibana privileges so users without Security Solution access are rejected', () => {
      const [routeConfig] = server.router.versioned.post.mock.calls[0];
      const authz = routeConfig.security?.authz as { requiredPrivileges?: unknown } | undefined;
      expect(authz?.requiredPrivileges).toEqual(['securitySolution', `${APP_ID}-entity-analytics`]);
    });
  });

  it('returns 200 and removes the task', async () => {
    const request = requestMock.create({
      method: 'post',
      path: DISABLE_LEAD_GENERATION_URL,
      body: {},
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: true });
    expect(mockRemoveTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskManager: mockTaskManagerStart,
        logger,
        namespace: expect.any(String),
      })
    );
  });

  it('returns 500 when Task Manager is not available', async () => {
    getStartServicesMock.mockResolvedValueOnce([{}, { taskManager: undefined }]);
    server = serverMock.create();
    disableLeadGenerationRoute(server.router, logger, getStartServicesMock);

    const request = requestMock.create({
      method: 'post',
      path: DISABLE_LEAD_GENERATION_URL,
      body: {},
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });
});
