/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import { syntheticsSecretConnectionType } from '../../../../common/types/saved_objects';
import { addSyntheticsParamsRoute, ParamsObjectSchema } from './add_param';
import {
  SECRET_CONNECTIONS_DISABLED_MESSAGE,
  UNNAMED_VAULT_REFERENCE_MESSAGE,
  unknownConnectionsMessage,
} from '../secret_connection/connection_utils';

jest.mock('../../../tasks/sync_global_params_task', () => ({
  asyncGlobalParamsPropagation: jest.fn(),
}));

describe('ParamsObjectSchema', () => {
  const base = { key: 'apiKey', value: 'secret' };

  it('rejects unknown keys so a sharing typo cannot create a space-local param', () => {
    expect(ParamsObjectSchema.safeParse({ ...base, share_across_space: true }).success).toBe(false);
  });

  it('accepts share_across_spaces', () => {
    expect(ParamsObjectSchema.parse({ ...base, share_across_spaces: true })).toEqual({
      ...base,
      share_across_spaces: true,
    });
  });
});

describe('add param route Vault checks', () => {
  const vaultParam = (key: string, connection: string) => ({
    key,
    value: `vault://${connection}@app/creds#password`,
  });

  const setup = (body: unknown, secretConnections: { enabled?: boolean } = {}) => {
    // The route's saved objects client is space-scoped, so it only sees this space's connections.
    const createPointInTimeFinder = jest.fn(({ type }: { type: string }) => ({
      async *find() {
        yield {
          saved_objects:
            type === syntheticsSecretConnectionType
              ? [{ attributes: { name: 'prod', config: {} } }]
              : [],
        };
      },
      close: jest.fn().mockResolvedValue(undefined),
    }));
    const bulkCreate = jest.fn(async (objects: Array<{ attributes: unknown }>) => ({
      saved_objects: objects.map(({ attributes }, i) => ({
        id: `param-${i}`,
        attributes,
        namespaces: ['default'],
      })),
    }));
    const response = httpServerMock.createResponseFactory();
    const routeContext = {
      request: { body },
      response,
      savedObjectsClient: { createPointInTimeFinder, bulkCreate },
      server: { config: { secretConnections } },
    } as any;
    return { routeContext, response, bulkCreate, createPointInTimeFinder };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a param that uses a connection of this space', async () => {
    const { routeContext, bulkCreate } = setup(vaultParam('pw', 'prod'));

    await addSyntheticsParamsRoute().handler(routeContext);

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    expect(asyncGlobalParamsPropagation).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an unknown connection', [vaultParam('pw', 'missing')], ['missing']],
    ['a connection that only exists in another space', [vaultParam('pw', 'other')], ['other']],
    [
      'a bulk request mixing known and unknown connections',
      [vaultParam('a', 'prod'), vaultParam('b', 'missing'), { key: 'c', value: 'plain' }],
      ['missing'],
    ],
  ])('rejects %s without writing', async (_label, body, unknown) => {
    const { routeContext, response, bulkCreate, createPointInTimeFinder } = setup(body);

    await addSyntheticsParamsRoute().handler(routeContext);

    expect(createPointInTimeFinder).toHaveBeenCalledWith({
      type: syntheticsSecretConnectionType,
      perPage: 1000,
    });
    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: unknownConnectionsMessage(unknown) },
    });
    expect(bulkCreate).not.toHaveBeenCalled();
    expect(asyncGlobalParamsPropagation).not.toHaveBeenCalled();
  });

  it.each([
    ['a malformed reference', vaultParam('pw', 'pr%6Fd'), /^Malformed Vault reference "vault:/],
    [
      'a reference without a connection name',
      { key: 'pw', value: 'vault://app/creds#password' },
      UNNAMED_VAULT_REFERENCE_MESSAGE,
    ],
  ])('rejects %s without writing', async (_label, body, message) => {
    const { routeContext, response, bulkCreate } = setup(body);

    await addSyntheticsParamsRoute().handler(routeContext);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: expect.stringMatching(message) },
    });
    expect(bulkCreate).not.toHaveBeenCalled();
  });

  it.each([
    ['a reference', vaultParam('pw', 'prod')],
    ['an encoded reference', { key: 'pw', value: 'vault://prod@app%2Fcreds#password' }],
  ])('rejects %s while secret connections are disabled', async (_label, body) => {
    const { routeContext, response, bulkCreate } = setup(body, { enabled: false });

    await addSyntheticsParamsRoute().handler(routeContext);

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE },
    });
    expect(bulkCreate).not.toHaveBeenCalled();
  });
});
