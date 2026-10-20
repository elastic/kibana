/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import { syntheticsSecretConnectionType } from '../../../../common/types/saved_objects';
import { editSyntheticsParamsRoute } from './edit_param';
import {
  SECRET_CONNECTIONS_DISABLED_MESSAGE,
  unknownConnectionsMessage,
} from '../secret_connection/connection_utils';

jest.mock('../../../tasks/sync_global_params_task', () => ({
  asyncGlobalParamsPropagation: jest.fn(),
}));

const vaultSource = (connection: string) => ({
  type: 'vault',
  path: 'app/creds',
  field: 'password',
  connection,
});

const setup = (body: Record<string, unknown>, secretConnections: { enabled?: boolean } = {}) => {
  // The route's saved objects client is space-scoped, so it only sees this space's connections.
  const createPointInTimeFinder = jest.fn(() => ({
    async *find() {
      yield { saved_objects: [{ attributes: { name: 'prod', config: {} } }] };
    },
    close: jest.fn().mockResolvedValue(undefined),
  }));
  const update = jest.fn().mockResolvedValue({
    id: 'param-1',
    attributes: { key: 'pw', value: 'vault://prod@app/creds#password' },
    namespaces: ['default'],
  });
  const getDecryptedAsInternalUser = jest.fn().mockResolvedValue({
    attributes: { key: 'pw', value: 'old' },
    namespaces: ['default'],
  });
  const response = httpServerMock.createResponseFactory();
  const routeContext = {
    request: { params: { id: 'param-1' }, body },
    response,
    spaceId: 'default',
    savedObjectsClient: { createPointInTimeFinder, update },
    server: {
      config: { secretConnections },
      encryptedSavedObjects: { getClient: () => ({ getDecryptedAsInternalUser }) },
    },
  } as any;
  return { routeContext, response, update, createPointInTimeFinder };
};

describe('edit param route Vault connection checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a param that uses a connection of this space', async () => {
    const { routeContext, update } = setup({ source: vaultSource('prod') });

    await editSyntheticsParamsRoute().handler(routeContext);

    expect(update).toHaveBeenCalledTimes(1);
    expect(asyncGlobalParamsPropagation).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an unknown connection', 'missing'],
    ['a connection that only exists in another space', 'other-space'],
  ])('rejects %s without writing', async (_label, name) => {
    const { routeContext, response, update, createPointInTimeFinder } = setup({
      source: vaultSource(name),
    });

    await editSyntheticsParamsRoute().handler(routeContext);

    expect(createPointInTimeFinder).toHaveBeenCalledWith({
      type: syntheticsSecretConnectionType,
      perPage: 1000,
    });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: unknownConnectionsMessage([name]) },
    });
    expect(update).not.toHaveBeenCalled();
    expect(asyncGlobalParamsPropagation).not.toHaveBeenCalled();
  });

  it.each([
    ['a vault source', { source: vaultSource('prod') }],
    ['a literal reference', { value: 'vault://prod@app/creds#password' }],
  ])('rejects %s while secret connections are disabled', async (_label, body) => {
    const { routeContext, response, update } = setup(body, { enabled: false });

    await editSyntheticsParamsRoute().handler(routeContext);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE },
    });
    expect(update).not.toHaveBeenCalled();
  });
});
