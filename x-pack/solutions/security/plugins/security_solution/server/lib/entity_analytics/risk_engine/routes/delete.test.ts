/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_ENGINE_CLEANUP_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEnginePrivilegesMock } from './risk_engine_privileges.mock';
import { riskEngineCleanupRoute } from './delete';
import { deleteSavedObjects } from '../utils/saved_object_configuration';

jest.mock('../utils/saved_object_configuration', () => ({
  deleteSavedObjects: jest.fn(),
}));

describe('riskEngineCleanupRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let clients: ReturnType<typeof requestContextMock.createMockClients>;
  let getStartServicesMock: jest.Mock;

  const buildRequest = () =>
    requestMock.create({
      method: 'delete',
      path: RISK_ENGINE_CLEANUP_URL,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const tools = requestContextMock.createTools();
    clients = tools.clients;
    context = requestContextMock.convertContext(tools.context);
    clients.riskScoreDataClient.tearDown.mockResolvedValue([]);
    (deleteSavedObjects as jest.Mock).mockResolvedValue(undefined);
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);
    riskEngineCleanupRoute(server.router, getStartServicesMock);
  });

  it('returns 403 and does not delete indices when risk engine privileges are missing', async () => {
    getStartServicesMock.mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithNoRiskEngineAccess(),
      },
    ]);

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(403);
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    expect(clients.riskScoreDataClient.tearDown).not.toHaveBeenCalled();
  });

  it('deletes the caller risk-score index and lookup index as the current user', async () => {
    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ cleanup_successful: true });
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).toHaveBeenCalledWith(
      { index: 'risk-score.risk-score-default' },
      { ignore: [404] }
    );
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).toHaveBeenCalledWith(
      { index: '.entity_analytics.risk_score.lookup-default' },
      { ignore: [404] }
    );
    expect(clients.core.elasticsearch.client.asInternalUser.indices.delete).not.toHaveBeenCalled();
  });

  it('returns 500 when cleanup reports a real error', async () => {
    clients.riskScoreDataClient.tearDown.mockResolvedValue([new Error('index delete denied')]);

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(response.body).toEqual({
      cleanup_successful: false,
      errors: [{ seq: 1, error: 'index delete denied' }],
      status_code: 500,
    });
  });
});
