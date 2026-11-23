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

const vaultReference = (connection: string) => `vault://${connection}@app/creds#password`;

const setup = (
  body: Record<string, unknown>,
  secretConnections: { enabled?: boolean } = {},
  {
    namespaces = ['default'],
    spaceId = 'default',
    hasAllRequested,
  }: { namespaces?: string[]; spaceId?: string; hasAllRequested?: boolean } = {}
) => {
  // The route's saved objects client is space-scoped, so it only sees this space's connections.
  const createPointInTimeFinder = jest.fn(() => ({
    async *find() {
      yield { saved_objects: [{ attributes: { name: 'prod', config: {} } }] };
    },
    close: jest.fn().mockResolvedValue(undefined),
  }));
  const update = jest.fn(
    async (_type: string, id: string, attributes: Record<string, unknown>) => ({
      id,
      attributes,
      namespaces,
    })
  );
  const getDecryptedAsInternalUser = jest.fn().mockResolvedValue({
    attributes: { key: 'pw', value: 'old' },
    namespaces,
  });
  const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
  const response = httpServerMock.createResponseFactory();
  const routeContext = {
    request: { params: { id: 'param-1' }, body },
    response,
    spaceId,
    savedObjectsClient: { createPointInTimeFinder, update },
    server: {
      config: { secretConnections },
      encryptedSavedObjects: { getClient: () => ({ getDecryptedAsInternalUser }) },
      ...(hasAllRequested !== undefined
        ? { security: { authz: { checkSavedObjectsPrivilegesWithRequest: () => checkPrivileges } } }
        : {}),
    },
  } as any;
  return { routeContext, response, update, createPointInTimeFinder, checkPrivileges };
};

describe('edit param route Vault connection checks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a param that uses a connection of this space', async () => {
    const { routeContext, update } = setup({ value: vaultReference('prod') });

    await editSyntheticsParamsRoute().handler(routeContext);

    expect(update).toHaveBeenCalledTimes(1);
    expect(asyncGlobalParamsPropagation).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a new value', { value: 'new' }, 'new'],
    ['an edit without a value', { description: 'd' }, 'old'],
  ])('returns the saved value for %s', async (_label, body, value) => {
    const { routeContext } = setup(body);

    const result = await editSyntheticsParamsRoute().handler(routeContext);

    expect(result).toEqual(expect.objectContaining({ key: 'pw', value }));
  });

  it.each([
    ['an unknown connection', 'missing'],
    ['a connection that only exists in another space', 'other-space'],
  ])('rejects %s without writing', async (_label, name) => {
    const { routeContext, response, update, createPointInTimeFinder } = setup({
      value: vaultReference(name),
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

  it('rejects a reference while secret connections are disabled', async () => {
    const { routeContext, response, update } = setup(
      { value: vaultReference('prod') },
      { enabled: false }
    );

    await editSyntheticsParamsRoute().handler(routeContext);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['all-spaces (*) without global update', ['*'], false, false, ['*']],
    [
      'multi-space without cross-space update',
      ['space-a', 'space-b'],
      false,
      false,
      ['space-a', 'space-b'],
    ],
    ['all-spaces (*) with global update', ['*'], true, true, ['*']],
    ['active-space only', ['space-a'], false, true, undefined],
  ])(
    'enforces cross-space RBAC for %s',
    async (_case, namespaces, hasAllRequested, shouldAllow, expectedSpaces) => {
      const { routeContext, response, update, checkPrivileges } = setup(
        { value: 'next' },
        {},
        { namespaces, spaceId: 'space-a', hasAllRequested }
      );

      await editSyntheticsParamsRoute().handler(routeContext);

      if (expectedSpaces) {
        expect(checkPrivileges).toHaveBeenCalledWith(
          'saved_object:synthetics-param/update',
          expectedSpaces
        );
      } else {
        expect(checkPrivileges).not.toHaveBeenCalled();
      }
      expect(response.forbidden).toHaveBeenCalledTimes(shouldAllow ? 0 : 1);
      expect(update).toHaveBeenCalledTimes(shouldAllow ? 1 : 0);
    }
  );
});
