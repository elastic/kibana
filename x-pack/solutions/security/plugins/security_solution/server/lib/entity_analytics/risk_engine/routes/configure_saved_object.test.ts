/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEnginePrivilegesMock } from './risk_engine_privileges.mock';
import { riskEngineDataClientMock } from '../risk_engine_data_client.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RISK_ENGINE_CONFIGURE_SO_URL } from '../../../../../common/constants';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';

describe('riskEnginConfigureSavedObjectRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockRiskEngineDataClient: ReturnType<typeof riskEngineDataClientMock.create>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    mockRiskEngineDataClient.updateRiskEngineSavedObject = jest.fn();
    context = requestContextMock.convertContext(
      requestContextMock.create({
        ...clients,
        riskEngineDataClient: mockRiskEngineDataClient,
      })
    );
    mockTaskManagerStart = taskManagerMock.createStart();
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        taskManager: mockTaskManagerStart,
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);
    riskEngineConfigureSavedObjectRoute(server.router, getStartServicesMock);
  });

  const buildRequest = (body: {}) => {
    return requestMock.create({
      method: 'put',
      path: RISK_ENGINE_CONFIGURE_SO_URL,
      body,
    });
  };

  it('should call the router with the correct route and handler', async () => {
    const request = buildRequest({});
    await server.inject(request, context);
    expect(mockRiskEngineDataClient.updateRiskEngineSavedObject).toHaveBeenCalled();
  });

  it('returns a 200 when the saved object is updated successfully', async () => {
    const request = buildRequest({
      exclude_alert_statuses: ['open'],
      range: { start: 'now-30d', end: 'now' },
      exclude_alert_tags: ['tag1'],
    });
    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ risk_engine_saved_object_configured: true });
    expect(mockRiskEngineDataClient.updateRiskEngineSavedObject).toHaveBeenCalledWith({
      excludeAlertStatuses: ['open'],
      range: { start: 'now-30d', end: 'now' },
      excludeAlertTags: ['tag1'],
    });
  });
});
