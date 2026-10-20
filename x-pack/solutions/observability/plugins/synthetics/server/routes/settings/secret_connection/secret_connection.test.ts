/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { HashiCorpVaultConfig } from '../../../../common/runtime_types';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import { saveSecretConnectionRoute, testSecretConnectionRoute } from './secret_connection';
import { testHashiCorpVault } from './vault_client';
import { SECRET_REENTRY_REQUIRED_MESSAGE } from './credential_guard';
import { hostNotAllowedMessage } from './address_guard';
import { SECRET_CONNECTIONS_DISABLED_MESSAGE } from './connection_utils';

jest.mock('./vault_client', () => ({
  testHashiCorpVault: jest.fn().mockResolvedValue({ ok: true }),
}));
jest.mock('../../../tasks/sync_global_params_task', () => ({
  asyncGlobalParamsPropagation: jest.fn(),
}));

const storedConfig: HashiCorpVaultConfig = {
  address: 'https://vault.example.com',
  authMethod: 'token',
};

const setup = ({
  body,
  stored,
  secretConnections = {},
}: {
  body: Record<string, unknown>;
  stored?: { config: HashiCorpVaultConfig; secrets: { token?: string } };
  secretConnections?: { enabled?: boolean; allowedHosts?: string[] };
}) => {
  const getDecryptedAsInternalUser = jest.fn(async () => {
    if (!stored) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('synthetics-secret-connection');
    }
    return { attributes: { name: 'prod', type: 'hashicorp_vault', ...stored } };
  });
  const create = jest.fn();
  const response = httpServerMock.createResponseFactory();
  const routeContext = {
    request: { body },
    response,
    spaceId: 'default',
    savedObjectsClient: { create },
    server: {
      config: { secretConnections: { allowedHosts: ['*'], ...secretConnections } },
      encryptedSavedObjects: { getClient: () => ({ getDecryptedAsInternalUser }) },
    },
  } as any;
  return { routeContext, create, response };
};

describe('secret connection routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST _test', () => {
    const runTest = (routeContext: unknown) =>
      testSecretConnectionRoute().handler(routeContext as any);

    it.each([
      ['the address changed', { ...storedConfig, address: 'https://attacker.example' }],
      ['TLS verification is turned off', { ...storedConfig, tlsSkipVerify: true }],
      ['the auth method changed', { ...storedConfig, authMethod: 'approle', roleId: 'role' }],
    ])('does not send the stored secret anywhere when %s', async (_label, config) => {
      const { routeContext } = setup({
        body: { name: 'prod', config },
        stored: { config: storedConfig, secrets: { token: 'stored-token' } },
      });

      const result = await runTest(routeContext);

      expect(result).toEqual({ ok: false, message: SECRET_REENTRY_REQUIRED_MESSAGE });
      expect(testHashiCorpVault).not.toHaveBeenCalled();
    });

    it('reuses the stored secret when nothing credential-sensitive changed', async () => {
      const { routeContext } = setup({
        body: { name: 'prod', config: { ...storedConfig, kvMount: 'kv' } },
        stored: { config: storedConfig, secrets: { token: 'stored-token' } },
      });

      await runTest(routeContext);

      expect(testHashiCorpVault).toHaveBeenCalledWith(
        expect.objectContaining({ address: storedConfig.address, token: 'stored-token' })
      );
    });

    it('makes no Vault request to a host outside allowedHosts', async () => {
      const { routeContext } = setup({
        body: { config: { ...storedConfig, address: 'https://other.example' }, secrets: {} },
        secretConnections: { allowedHosts: ['vault.example.com'] },
      });

      const result = await runTest(routeContext);

      expect(result).toEqual({
        ok: false,
        message: hostNotAllowedMessage('https://other.example'),
      });
      expect(testHashiCorpVault).not.toHaveBeenCalled();
    });

    it('responds 404 without a Vault request while secret connections are disabled', async () => {
      const { routeContext, response } = setup({
        body: { config: storedConfig, secrets: { token: 't' } },
        secretConnections: { enabled: false },
      });

      await runTest(routeContext);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE },
      });
      expect(testHashiCorpVault).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    const save = (routeContext: unknown) =>
      saveSecretConnectionRoute().handler(routeContext as any);

    it('writes nothing for a host outside allowedHosts', async () => {
      const { routeContext, create, response } = setup({
        body: {
          name: 'prod',
          config: { ...storedConfig, address: 'https://other.example' },
          secrets: { token: 't' },
        },
        secretConnections: { allowedHosts: ['vault.example.com'] },
      });

      await save(routeContext);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: hostNotAllowedMessage('https://other.example') },
      });
      expect(create).not.toHaveBeenCalled();
      expect(asyncGlobalParamsPropagation).not.toHaveBeenCalled();
    });

    it('writes nothing when a re-pointed connection keeps the stored secret', async () => {
      const { routeContext, create, response } = setup({
        body: { name: 'prod', config: { ...storedConfig, address: 'https://attacker.example' } },
        stored: { config: storedConfig, secrets: { token: 'stored-token' } },
      });

      await save(routeContext);

      expect(response.badRequest).toHaveBeenCalledWith({
        body: { message: SECRET_REENTRY_REQUIRED_MESSAGE },
      });
      expect(create).not.toHaveBeenCalled();
    });

    it('saves and propagates a connection to an allowed host', async () => {
      const { routeContext, create } = setup({
        body: { name: 'prod', config: storedConfig, secrets: { token: 't' } },
        secretConnections: { allowedHosts: ['vault.example.com'] },
      });

      await save(routeContext);

      expect(create).toHaveBeenCalledTimes(1);
      expect(asyncGlobalParamsPropagation).toHaveBeenCalledTimes(1);
    });
  });
});
