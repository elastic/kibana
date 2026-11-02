/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { HashiCorpVaultConfig } from '../../../../common/runtime_types';
import { syntheticsSecretConnectionType } from '../../../../common/types/saved_objects';
import { asyncGlobalParamsPropagation } from '../../../tasks/sync_global_params_task';
import {
  deleteSecretConnectionRoute,
  saveSecretConnectionRoute,
  testSecretConnectionRoute,
} from './secret_connection';
import { testHashiCorpVault } from './vault_client';
import { SECRET_REENTRY_REQUIRED_MESSAGE } from './credential_guard';
import { hostNotAllowedMessage, LOOPBACK_NOT_TESTABLE_MESSAGE } from './address_guard';
import { connectionInUseMessage, SECRET_CONNECTIONS_DISABLED_MESSAGE } from './connection_utils';

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
  params,
  stored,
  secretConnections = {},
  globalParams = {},
  monitors = [],
}: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  stored?: { config: HashiCorpVaultConfig; secrets: { token?: string } };
  secretConnections?: { enabled?: boolean; allowedHosts?: string[] };
  globalParams?: Record<string, string>;
  monitors?: Array<Record<string, unknown>>;
}) => {
  // Like the real client: a hidden type that was not included is reported as not found.
  const encryptedClient = (includedHiddenTypes: string[] = []) => ({
    getDecryptedAsInternalUser: jest.fn(async () => {
      if (!stored || !includedHiddenTypes.includes(syntheticsSecretConnectionType)) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(syntheticsSecretConnectionType);
      }
      return { attributes: { name: 'prod', type: 'hashicorp_vault', ...stored } };
    }),
  });
  const create = jest.fn();
  const deleteFn = jest.fn();
  const response = httpServerMock.createResponseFactory();
  const routeContext = {
    request: { body, params },
    response,
    spaceId: 'default',
    savedObjectsClient: { create, delete: deleteFn },
    syntheticsMonitorClient: {
      getSyntheticsParams: jest.fn().mockResolvedValue({ default: globalParams }),
    },
    monitorConfigRepository: {
      findDecryptedMonitors: jest
        .fn()
        .mockResolvedValue(monitors.map((attributes) => ({ attributes, namespaces: ['default'] }))),
    },
    server: {
      config: { secretConnections: { allowedHosts: ['*'], ...secretConnections } },
      logger: { warn: jest.fn(), debug: jest.fn() },
      encryptedSavedObjects: {
        getClient: (options?: { includedHiddenTypes?: string[] }) =>
          encryptedClient(options?.includedHiddenTypes),
      },
    },
  } as any;
  return { routeContext, create, deleteFn, response };
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
        expect.objectContaining({ address: storedConfig.address, token: 'stored-token' }),
        routeContext.server.logger
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

    it.each(['http://127.0.0.1:8200', 'http://localhost:8200', 'http://[::1]:8200'])(
      'refuses to test the loopback address %s from Kibana',
      async (loopback) => {
        const { routeContext } = setup({
          body: { name: 'prod', config: { ...storedConfig, address: loopback } },
          stored: { config: { ...storedConfig, address: loopback }, secrets: { token: 'stored' } },
        });

        const result = await runTest(routeContext);

        expect(result).toEqual({ ok: false, message: LOOPBACK_NOT_TESTABLE_MESSAGE });
        expect(testHashiCorpVault).not.toHaveBeenCalled();
      }
    );

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

    it('responds 404 and writes nothing while secret connections are disabled', async () => {
      const { routeContext, create, response } = setup({
        body: { name: 'prod', config: storedConfig, secrets: { token: 't' } },
        secretConnections: { enabled: false },
      });

      await save(routeContext);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE },
      });
      expect(create).not.toHaveBeenCalled();
      expect(asyncGlobalParamsPropagation).not.toHaveBeenCalled();
    });

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

    it('keeps the stored secret on a blank edit', async () => {
      const { routeContext, create } = setup({
        body: { name: 'prod', config: { ...storedConfig, kvMount: 'kv' } },
        stored: { config: storedConfig, secrets: { token: 'stored-token' } },
      });

      await save(routeContext);

      expect(create).toHaveBeenCalledWith(
        syntheticsSecretConnectionType,
        expect.objectContaining({ secrets: { token: 'stored-token', secretId: undefined } }),
        expect.anything()
      );
    });
  });

  describe('DELETE', () => {
    const remove = (routeContext: unknown) =>
      deleteSecretConnectionRoute().handler(routeContext as any);

    it('refuses to delete a connection that params and monitors still reference', async () => {
      const { routeContext, deleteFn, response } = setup({
        params: { name: 'prod' },
        globalParams: { apiKey: 'vault://prod@app#key', other: 'vault://staging@app#key' },
        monitors: [
          { name: 'checkout', password: 'vault://prod@app#password' },
          { name: 'unrelated', password: 'plain' },
        ],
      });

      await remove(routeContext);

      expect(response.conflict).toHaveBeenCalledWith({
        body: {
          message: connectionInUseMessage('prod', { params: ['apiKey'], monitors: ['checkout'] }),
        },
      });
      expect(deleteFn).not.toHaveBeenCalled();
      expect(asyncGlobalParamsPropagation).not.toHaveBeenCalled();
    });

    it('deletes and propagates a connection nothing references', async () => {
      const { routeContext, deleteFn } = setup({
        params: { name: 'prod' },
        globalParams: { other: 'vault://staging@app#key' },
        monitors: [{ name: 'browser', 'source.inline.script': 'vault://prod@app#password' }],
      });

      expect(await remove(routeContext)).toEqual({ deleted: true });
      expect(deleteFn).toHaveBeenCalledTimes(1);
      expect(asyncGlobalParamsPropagation).toHaveBeenCalledTimes(1);
    });
  });
});
