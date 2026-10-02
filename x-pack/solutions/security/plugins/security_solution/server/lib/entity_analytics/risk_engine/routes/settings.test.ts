/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { riskEngineSettingsRoute } from './settings';
import { RISK_ENGINE_SETTINGS_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEngineDataClientMock } from '../risk_engine_data_client.mock';

describe('risk engine settings route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let mockRiskEngineDataClient: ReturnType<typeof riskEngineDataClientMock.create>;

  beforeEach(() => {
    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    context = requestContextMock.convertContext(
      requestContextMock.create({
        ...clients,
        riskEngineDataClient: mockRiskEngineDataClient,
      })
    );
    riskEngineSettingsRoute(server.router);
  });

  const buildRequest = () => requestMock.create({ method: 'get', path: RISK_ENGINE_SETTINGS_URL });

  it('returns the saved configuration when the risk engine is configured', async () => {
    mockRiskEngineDataClient.getConfiguration.mockResolvedValue({
      range: { start: 'now-7d', end: 'now' },
      excludeAlertStatuses: [],
      enableResetToZero: false,
      filters: [{ entity_types: ['host'], filter: 'host.name: *' }],
      // @ts-expect-error the route only reads the attributes asserted below
      enabled: true,
    });

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      range: { start: 'now-7d', end: 'now' },
      includeClosedAlerts: true,
      enableResetToZero: false,
      filters: [{ entity_types: ['host'], filter: 'host.name: *' }],
    });
  });

  it('returns the default configuration when the risk engine is not configured yet', async () => {
    mockRiskEngineDataClient.getConfiguration.mockResolvedValue(null);

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      range: { start: 'now-30d', end: 'now' },
      includeClosedAlerts: false,
      enableResetToZero: true,
      filters: [],
    });
  });

  it('returns a 500 when reading the configuration fails', async () => {
    mockRiskEngineDataClient.getConfiguration.mockRejectedValue(new Error('something went wrong'));

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body.message).toEqual('something went wrong');
  });
});
