/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_ENGINE_SETTINGS_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEngineSettingsRoute } from './settings';
import { getConfiguration } from '../utils/saved_object_configuration';

jest.mock('../utils/saved_object_configuration', () => ({
  getConfiguration: jest.fn(),
}));

describe('riskEngineSettingsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let clients: ReturnType<typeof requestContextMock.createMockClients>;
  let logger: ReturnType<typeof requestContextMock.createMockClients>['logger'];

  beforeEach(() => {
    server = serverMock.create();
    const tools = requestContextMock.createTools();
    clients = tools.clients;
    logger = clients.logger;
    context = requestContextMock.convertContext(tools.context);
    (getConfiguration as jest.Mock).mockResolvedValue({
      range: { start: 'now-30d', end: 'now' },
      excludeAlertStatuses: ['closed'],
      enableResetToZero: true,
      filters: [{ entity_types: ['host', 'user'], filter: 'user.name: *' }],
    });
    riskEngineSettingsRoute(server.router, logger);
  });

  const buildRequest = () =>
    requestMock.create({
      method: 'get',
      path: RISK_ENGINE_SETTINGS_URL,
    });

  it('returns lookback, closed alerts, reset-to-zero, and filters from the saved object', async () => {
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      range: { start: 'now-30d', end: 'now' },
      includeClosedAlerts: false,
      enableResetToZero: true,
      filters: [{ entity_types: ['host', 'user'], filter: 'user.name: *' }],
    });
    expect(getConfiguration).toHaveBeenCalledWith({
      savedObjectsClient: clients.savedObjectsClient,
      logger,
      namespace: 'default',
    });
  });

  it('reports closed alerts as included when closed is not excluded', async () => {
    (getConfiguration as jest.Mock).mockResolvedValue({
      range: { start: 'now-15d', end: 'now' },
      excludeAlertStatuses: [],
      enableResetToZero: false,
      filters: [],
    });

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      range: { start: 'now-15d', end: 'now' },
      includeClosedAlerts: true,
      enableResetToZero: false,
      filters: [],
    });
  });
});
