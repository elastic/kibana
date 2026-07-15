/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { APP_ID } from '../../../../../common';
import { getLeadGenerationStatusRoute } from './get_lead_generation_status';
import { LEAD_GENERATION_STATUS_URL } from '../../../../../common/entity_analytics/lead_generation/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';

const mockGetStatus = jest.fn();
jest.mock('../lead_data_client', () => ({
  createLeadDataClient: () => ({ getStatus: mockGetStatus }),
}));

const makeEsSecurityException = () => ({
  statusCode: 403,
  body: { error: { type: 'security_exception', reason: 'access denied' } },
  meta: { body: { error: { type: 'security_exception', reason: 'access denied' } } },
});

jest.mock('../tasks', () => ({
  getLeadGenerationTaskId: (spaceId: string) =>
    `entity_analytics:lead_generation:engine:${spaceId}:1.0.0`,
}));

describe('getLeadGenerationStatusRoute', () => {
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
    getLeadGenerationStatusRoute(server.router, logger, getStartServicesMock);
  });

  describe('route security config', () => {
    it('declares the required Kibana privileges so users without Security Solution access are rejected', () => {
      const [routeConfig] = server.router.versioned.get.mock.calls[0];
      const authz = routeConfig.security?.authz as { requiredPrivileges?: unknown } | undefined;
      expect(authz?.requiredPrivileges).toEqual(['securitySolution', `${APP_ID}-entity-analytics`]);
    });
  });

  it('returns 200 with engine status when task exists (isEnabled: true)', async () => {
    mockGetStatus.mockResolvedValueOnce({
      isEnabled: true,
      indexExists: true,
      totalLeads: 42,
      lastRun: '2026-03-10T00:00:00.000Z',
    });

    const request = requestMock.create({
      method: 'get',
      path: LEAD_GENERATION_STATUS_URL,
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body.isEnabled).toBe(true);
    expect(mockGetStatus).toHaveBeenCalledWith({ isEnabled: true });
  });

  it('returns isEnabled: false when task does not exist', async () => {
    mockTaskManagerStart.get.mockRejectedValueOnce(new Error('Not found'));
    mockGetStatus.mockResolvedValueOnce({
      isEnabled: false,
      indexExists: true,
      totalLeads: 10,
      lastRun: '2026-03-09T00:00:00.000Z',
    });

    const request = requestMock.create({
      method: 'get',
      path: LEAD_GENERATION_STATUS_URL,
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body.isEnabled).toBe(false);
    expect(mockGetStatus).toHaveBeenCalledWith({ isEnabled: false });
  });

  it('returns 500 on generic error', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('status check failed'));

    const request = requestMock.create({
      method: 'get',
      path: LEAD_GENERATION_STATUS_URL,
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(500);
  });

  it('returns 403 when ES denies read access to the leads index', async () => {
    mockGetStatus.mockRejectedValueOnce(makeEsSecurityException());

    const request = requestMock.create({
      method: 'get',
      path: LEAD_GENERATION_STATUS_URL,
    });

    const response = await server.inject(request, context);
    expect(response.status).toEqual(403);
  });
});
