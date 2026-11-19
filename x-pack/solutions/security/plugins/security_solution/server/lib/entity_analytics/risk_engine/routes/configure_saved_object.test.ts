/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RISK_ENGINE_CONFIGURE_SO_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEnginePrivilegesMock } from './risk_engine_privileges.mock';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';
import {
  getConfiguration,
  initSavedObjects,
  updateSavedObjectAttribute,
} from '../utils/saved_object_configuration';

jest.mock('../utils/saved_object_configuration', () => ({
  getConfiguration: jest.fn(),
  initSavedObjects: jest.fn(),
  updateSavedObjectAttribute: jest.fn(),
}));

describe('riskEnginConfigureSavedObjectRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let clients: ReturnType<typeof requestContextMock.createMockClients>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let getStartServicesMock: jest.Mock;
  let logger: ReturnType<typeof requestContextMock.createMockClients>['logger'];

  beforeEach(() => {
    server = serverMock.create();
    const tools = requestContextMock.createTools();
    clients = tools.clients;
    logger = clients.logger;
    context = requestContextMock.convertContext(tools.context);
    mockTaskManagerStart = taskManagerMock.createStart();
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        taskManager: mockTaskManagerStart,
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);
    (getConfiguration as jest.Mock).mockResolvedValue({ enabled: true });
    (initSavedObjects as jest.Mock).mockResolvedValue({});
    (updateSavedObjectAttribute as jest.Mock).mockResolvedValue({});
    riskEngineConfigureSavedObjectRoute(server.router, logger, getStartServicesMock);
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
    expect(updateSavedObjectAttribute).toHaveBeenCalled();
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
    expect(updateSavedObjectAttribute).toHaveBeenCalledWith({
      savedObjectsClient: clients.savedObjectsClient,
      logger,
      namespace: 'default',
      attributes: {
        excludeAlertStatuses: ['open'],
        range: { start: 'now-30d', end: 'now' },
        excludeAlertTags: ['tag1'],
        enableResetToZero: undefined,
        filters: undefined,
      },
    });
    expect(initSavedObjects).not.toHaveBeenCalled();
  });

  it('passes page_size to the saved object update', async () => {
    const request = buildRequest({
      page_size: 5000,
    });
    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(updateSavedObjectAttribute).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          pageSize: 5000,
        }),
      })
    );
  });

  it('initializes the saved object when no configuration exists', async () => {
    (getConfiguration as jest.Mock).mockResolvedValue(null);
    const request = buildRequest({ enable_reset_to_zero: false });
    const response = await server.inject(request, context);
    expect(response.status).toEqual(200);
    expect(initSavedObjects).toHaveBeenCalledWith({
      savedObjectsClient: clients.savedObjectsClient,
      logger,
      namespace: 'default',
    });
  });
});
