/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/common';
import { RISK_ENGINE_CLEANUP_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEnginePrivilegesMock } from '../../risk_score/routes/risk_engine_privileges.mock';
import { riskEngineCleanupRoute } from './delete';
import { deleteSavedObjects } from '../../risk_score/configuration/saved_object_configuration';

jest.mock('../../risk_score/configuration/saved_object_configuration', () => ({
  deleteSavedObjects: jest.fn(),
}));

describe('riskEngineCleanupRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let clients: ReturnType<typeof requestContextMock.createMockClients>;
  let getStartServicesMock: jest.Mock;
  let removeIfExists: jest.Mock;
  let getTask: jest.Mock;

  const buildRequest = () =>
    requestMock.create({
      method: 'delete',
      path: RISK_ENGINE_CLEANUP_URL,
    });

  const privilegeCheck = (granted: boolean) => ({
    username: 'test-user',
    has_all_requested: granted,
    cluster: {},
    index: {},
    application: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    const tools = requestContextMock.createTools();
    clients = tools.clients;
    context = requestContextMock.convertContext(tools.context);
    clients.riskScoreDataClient.tearDown.mockResolvedValue([]);
    (deleteSavedObjects as jest.Mock).mockResolvedValue(undefined);
    clients.core.elasticsearch.client.asInternalUser.indices.exists.mockResolvedValue(true);
    clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockResolvedValue(
      privilegeCheck(true)
    );
    clients.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResolvedValue({
      version_conflicts: 0,
      failures: [],
      timed_out: false,
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
    getTask = jest.fn().mockResolvedValue({ status: 'idle' });
    getStartServicesMock = jest.fn().mockResolvedValue([
      {},
      {
        security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
        taskManager: { removeIfExists, get: getTask },
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
    expect(clients.core.elasticsearch.client.asInternalUser.indices.exists).toHaveBeenCalledWith({
      index: getEntitiesAlias(ENTITY_LATEST, 'default'),
    });
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.exists).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asInternalUser.indices.delete).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asInternalUser.delete).not.toHaveBeenCalled();
    expect(
      clients.core.elasticsearch.client.asInternalUser.ingest.deletePipeline
    ).not.toHaveBeenCalled();
    expect(removeIfExists).toHaveBeenCalledWith('risk-score:default');
    expect(removeIfExists.mock.invocationCallOrder[0]).toBeLessThan(
      clients.core.elasticsearch.client.asCurrentUser.indices.deleteDataStream.mock
        .invocationCallOrder[0]
    );
    expect(removeIfExists.mock.invocationCallOrder[0]).toBeLessThan(
      clients.core.elasticsearch.client.asCurrentUser.updateByQuery.mock.invocationCallOrder[0]
    );
    expect(
      clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges
    ).toHaveBeenCalledWith({
      index: [
        {
          names: [getEntitiesAlias(ENTITY_LATEST, 'default')],
          privileges: ['read', 'write'],
        },
      ],
    });
    expect(
      clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges
    ).toHaveBeenCalledWith({
      index: [
        {
          names: ['risk-score.risk-score-default', '.entity_analytics.risk_score.lookup-default'],
          privileges: ['delete_index'],
        },
      ],
    });
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: getEntitiesAlias(ENTITY_LATEST, 'default'),
      })
    );
    expect(clients.core.elasticsearch.client.asInternalUser.updateByQuery).not.toHaveBeenCalled();
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

  it('returns 403 and does not stop scoring when the caller cannot read and write entity documents', async () => {
    clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockImplementation(
      async (request) => {
        const privileges = request.index?.flatMap((check) => check.privileges) ?? [];
        return privilegeCheck(!privileges.includes('read') && !privileges.includes('write'));
      }
    );

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(403);
    expect(removeIfExists).not.toHaveBeenCalled();
    expect(deleteSavedObjects).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
  });

  it('cleans up risk resources when the entity index does not exist', async () => {
    clients.core.elasticsearch.client.asInternalUser.indices.exists.mockResolvedValue(false);

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(
      clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges
    ).toHaveBeenCalledTimes(1);
    expect(
      clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges
    ).toHaveBeenCalledWith({
      index: [
        {
          names: ['risk-score.risk-score-default', '.entity_analytics.risk_score.lookup-default'],
          privileges: ['delete_index'],
        },
      ],
    });
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).not.toHaveBeenCalled();
    expect(removeIfExists).toHaveBeenCalledWith('risk-score:default');
  });

  it('returns 403 and leaves the task when the caller cannot delete risk resources', async () => {
    clients.core.elasticsearch.client.asCurrentUser.security.hasPrivileges.mockImplementation(
      async (request) => {
        const privileges = request.index?.flatMap((check) => check.privileges) ?? [];
        return privilegeCheck(!privileges.includes('delete_index'));
      }
    );

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(403);
    expect(removeIfExists).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    expect(
      clients.core.elasticsearch.client.asCurrentUser.indices.deleteDataStream
    ).not.toHaveBeenCalled();
    expect(deleteSavedObjects).not.toHaveBeenCalled();
  });

  it.each(['running', 'claiming'] as const)(
    'returns 409 and deletes nothing when the maintainer task is %s',
    async (status) => {
      getTask.mockResolvedValue({ status });

      const response = await server.inject(buildRequest(), context);

      expect(response.status).toEqual(409);
      expect(removeIfExists).not.toHaveBeenCalled();
      expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
      expect(deleteSavedObjects).not.toHaveBeenCalled();
    }
  );

  it('still cleans up when the maintainer task does not exist', async () => {
    getTask.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(200);
    expect(removeIfExists).toHaveBeenCalledWith('risk-score:default');
  });

  it('returns 500 and does not delete data when the maintainer task cannot be removed', async () => {
    removeIfExists.mockRejectedValue(new Error('task remove failed'));

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(
      clients.core.elasticsearch.client.asCurrentUser.indices.deleteDataStream
    ).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asCurrentUser.indices.delete).not.toHaveBeenCalled();
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).not.toHaveBeenCalled();
    expect(deleteSavedObjects).not.toHaveBeenCalled();
  });

  it('does not report success when entity risk fields stay conflicted', async () => {
    clients.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResolvedValue({
      version_conflicts: 2,
      failures: [],
      timed_out: false,
    });

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledTimes(2);
    expect(deleteSavedObjects).not.toHaveBeenCalled();
  });

  it('does not report success when clearing entity risk times out', async () => {
    clients.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResolvedValue({
      version_conflicts: 0,
      failures: [],
      timed_out: true,
    });

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledTimes(2);
    expect(deleteSavedObjects).not.toHaveBeenCalled();
  });

  it('does not report success when the entity risk update returns failures', async () => {
    clients.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResolvedValue({
      version_conflicts: 0,
      failures: [
        {
          cause: { type: 'version_conflict_engine_exception', reason: 'conflict' },
          id: 'entity-1',
          index: 'entities-latest-default',
          status: 409,
        },
      ],
      timed_out: false,
    });

    const response = await server.inject(buildRequest(), context);

    expect(response.status).toEqual(500);
    expect(clients.core.elasticsearch.client.asCurrentUser.updateByQuery).toHaveBeenCalledTimes(2);
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
