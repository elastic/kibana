/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
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
  let removeIfExists: jest.Mock;

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
    clients.core.elasticsearch.client.asInternalUser.updateByQuery.mockResolvedValue({
      version_conflicts: 0,
    });
    clients.core.elasticsearch.client.asCurrentUser.indices.delete.mockImplementation(
      async (params) => {
        const index = Array.isArray(params.index) ? params.index[0] : params.index;
        if (index !== 'risk-score.risk-score-default') {
          return { acknowledged: true };
        }
        const dataStreamDeleted =
          clients.core.elasticsearch.client.asCurrentUser.indices.deleteDataStream.mock.calls.some(
            ([request]) => {
              const name = Array.isArray(request.name) ? request.name[0] : request.name;
              return name === index;
            }
          );
        if (!dataStreamDeleted) {
          throw Object.assign(new Error('matches a data stream'), { meta: { statusCode: 400 } });
        }
        return { acknowledged: true };
      }
    );
    removeIfExists = jest.fn().mockResolvedValue(undefined);
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
        taskManager: { removeIfExists },
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
    expect(
      clients.core.elasticsearch.client.asCurrentUser.indices.deleteDataStream
    ).toHaveBeenCalledWith({ name: 'risk-score.risk-score-default' }, { ignore: [404] });
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).toHaveBeenCalledWith(
      { index: 'risk-score.risk-score-default' },
      { ignore: [404] }
    );
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).toHaveBeenCalledWith(
      { index: '.entity_analytics.risk_score.lookup-default' },
      { ignore: [404] }
    );
    expect(clients.core.elasticsearch.client.asInternalUser.indices.delete).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asInternalUser.delete).not.toHaveBeenCalled();
    expect(
      clients.core.elasticsearch.client.asInternalUser.ingest.deletePipeline
    ).not.toHaveBeenCalled();
    expect(removeIfExists).toHaveBeenCalledWith('risk-score:default');
    expect(clients.core.elasticsearch.client.asInternalUser.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: getEntitiesAlias(ENTITY_LATEST, 'default'),
      })
    );
  });

  it('returns 400 and does not delete anything when Task Manager is unavailable', async () => {
    getStartServicesMock.mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
      },
    ]);

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(400);
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    expect(clients.riskScoreDataClient.tearDown).not.toHaveBeenCalled();
    expect(deleteSavedObjects).not.toHaveBeenCalled();
  });

  it('does not remove the maintainer task when the caller cannot delete the risk score index', async () => {
    clients.core.elasticsearch.client.asCurrentUser.indices.delete.mockRejectedValueOnce(
      Object.assign(new Error('delete_index denied'), { meta: { statusCode: 403 } })
    );

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(removeIfExists).not.toHaveBeenCalled();
    expect(deleteSavedObjects).not.toHaveBeenCalled();
  });

  it('does not stop scoring when entity risk fields stay conflicted', async () => {
    clients.core.elasticsearch.client.asInternalUser.updateByQuery.mockResolvedValue({
      version_conflicts: 2,
    });

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(clients.core.elasticsearch.client.asInternalUser.updateByQuery).toHaveBeenCalledTimes(2);
    expect(removeIfExists).not.toHaveBeenCalled();
    expect(deleteSavedObjects).not.toHaveBeenCalled();
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
