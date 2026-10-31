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
  getAffectedMonitorsRoute,
  previewAffectedMonitorsRoute,
  saveSecretConnectionRoute,
  testSecretConnectionRoute,
} from './secret_connection';
import { testHashiCorpVault } from './vault_client';
import { AFFECTED_MONITORS_TIMEOUT_MS } from './affected_monitors';
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
  connections = [],
}: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  stored?: { config: HashiCorpVaultConfig; secrets: { token?: string } };
  secretConnections?: { enabled?: boolean; allowedHosts?: string[] };
  globalParams?: Record<string, string>;
  monitors?: Array<Record<string, unknown>>;
  connections?: Array<{ name: string; config: HashiCorpVaultConfig }>;
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
    savedObjectsClient: {
      create,
      delete: deleteFn,
      createPointInTimeFinder: jest.fn(() => ({
        async *find() {
          yield {
            saved_objects: connections.map(({ name, config }) => ({
              attributes: { name, type: 'hashicorp_vault', config },
            })),
          };
        },
        close: jest.fn().mockResolvedValue(undefined),
      })),
    },
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

describe('saving allowed monitor hosts', () => {
  const save = (routeContext: unknown) => saveSecretConnectionRoute().handler(routeContext as any);
  const body = (allowedMonitorHosts?: string[]) => ({
    name: 'prod',
    config: { ...storedConfig, allowedMonitorHosts },
    secrets: { token: 't' },
  });
  const savedHosts = (create: jest.Mock) => create.mock.calls[0][1].config.allowedMonitorHosts;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the hosts lowercase, without trailing dots or duplicates', async () => {
    const { routeContext, create } = setup({
      body: body(['API.Example.com.', 'api.example.com', 'b.example.com']),
    });

    await save(routeContext);

    expect(savedHosts(create)).toEqual(['api.example.com', 'b.example.com']);
  });

  it('leaves the setting out when there are no hosts', async () => {
    const { routeContext, create } = setup({ body: body([]) });

    await save(routeContext);

    expect(create.mock.calls[0][1].config).not.toHaveProperty('allowedMonitorHosts');
  });

  it('does not look at monitors, so it never waits for the check', async () => {
    const { routeContext } = setup({
      body: body(['api.example.com']),
      monitors: [{ name: 'checkout', type: 'http', urls: 'https://other.example' }],
    });

    const result = (await save(routeContext)) as any;

    expect(routeContext.monitorConfigRepository.findDecryptedMonitors).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('affectedMonitors');
  });
});

describe('affected monitors routes', () => {
  const monitors = [
    { name: 'ok', type: 'http', urls: 'https://api.example.com/v1', max_redirects: '0' },
    { name: 'other-host', type: 'http', urls: 'https://other.example/v1', max_redirects: '0' },
    { name: 'redirects', type: 'http', urls: 'https://api.example.com', max_redirects: '3' },
    { name: 'proxy', type: 'http', urls: 'https://api.example.com', proxy_url: 'http://p.x:80' },
    { name: 'login', type: 'browser' },
    { name: 'tcp-via-param', type: 'tcp', hosts: '${tcpHost}:443' },
    { name: 'no-connection', type: 'http', urls: 'https://other.example', max_redirects: '0' },
  ].map((monitor) => ({
    ...monitor,
    // All but the last use the connection: directly, or through a parameter.
    password:
      monitor.name === 'no-connection'
        ? 'plain'
        : monitor.name === 'tcp-via-param'
        ? '${secret}'
        : 'vault://prod@app#password',
  }));
  const globalParams = { secret: 'vault://prod@app#key', tcpHost: 'x.example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST (preview)', () => {
    const preview = (routeContext: unknown) =>
      previewAffectedMonitorsRoute().handler(routeContext as any);
    const previewBody = (allowedMonitorHosts: string[]) => ({ name: 'prod', allowedMonitorHosts });

    it('lists the monitors that use the connection and would be refused', async () => {
      const { routeContext } = setup({
        body: previewBody(['api.example.com']),
        monitors,
        globalParams,
      });

      const result = (await preview(routeContext)) as any;

      expect(result).toEqual({
        monitors: [
          { name: 'other-host', reason: 'host' },
          { name: 'redirects', reason: 'redirects' },
          { name: 'proxy', reason: 'host' },
          { name: 'login', reason: 'monitor_type' },
          { name: 'tcp-via-param', reason: 'host' },
        ],
        total: 5,
      });
    });

    it('finds browser monitors that get the reference through merged parameters', async () => {
      const { routeContext } = setup({
        body: previewBody(['api.example.com']),
        // Browser monitors read parameters as params.name, so none of these has the reference in
        // a saved field. Global parameters are merged under the monitor's own.
        globalParams: { dbPassword: 'vault://prod@app#password' },
        monitors: [
          { name: 'uses-global', type: 'browser', params: '' },
          { name: 'overrides-global', type: 'browser', params: '{"dbPassword":"plain"}' },
          { name: 'local-reference', type: 'browser', params: '{"other":"vault://prod@app#key"}' },
          { name: 'http-without-reference', type: 'http', urls: 'https://other.example' },
        ],
      });

      const result = (await preview(routeContext)) as any;

      expect(result.monitors).toEqual([
        { name: 'uses-global', reason: 'monitor_type' },
        { name: 'local-reference', reason: 'monitor_type' },
      ]);
    });

    it('finds monitors when a parameter they use holds quotes or backslashes', async () => {
      const { routeContext } = setup({
        body: previewBody(['api.example.com']),
        globalParams: { secret: 'vault://prod@app#key', pw: 'a"b\\c', host: 'other.example' },
        monitors: [
          {
            name: 'tricky',
            type: 'http',
            urls: 'https://${host}/x',
            password: '${secret}',
            'check.request.body': '${pw}',
          },
        ],
      });

      const result = (await preview(routeContext)) as any;

      expect(result.monitors).toEqual([{ name: 'tricky', reason: 'host' }]);
    });

    it('caps the listed monitors but counts them all', async () => {
      const many = Array.from({ length: 25 }, (_, i) => ({
        name: `m${i}`,
        type: 'http',
        urls: 'https://other.example',
        max_redirects: '0',
        password: 'vault://prod@app#password',
      }));
      const { routeContext } = setup({ body: previewBody(['api.example.com']), monitors: many });

      const result = (await preview(routeContext)) as any;

      expect(result.monitors).toHaveLength(20);
      expect(result.total).toBe(25);
    });

    it('does not scan for a restriction of another connection', async () => {
      const { routeContext } = setup({
        body: { name: 'staging', allowedMonitorHosts: ['api.example.com'] },
        monitors,
        globalParams,
      });

      expect(await preview(routeContext)).toEqual({ monitors: [], total: 0 });
    });

    it('gives up on a slow lookup instead of leaving the request hanging', async () => {
      jest.useFakeTimers();
      try {
        const { routeContext } = setup({ body: previewBody(['api.example.com']) });
        routeContext.monitorConfigRepository.findDecryptedMonitors.mockReturnValue(
          new Promise(() => {})
        );

        const pending = preview(routeContext);
        const outcome = pending.then(
          () => 'resolved',
          (e: Error) => e.message
        );
        await jest.advanceTimersByTimeAsync(AFFECTED_MONITORS_TIMEOUT_MS);

        expect(await outcome).toContain('timed out');
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('GET (saved connections)', () => {
    const getAffected = (routeContext: unknown) =>
      getAffectedMonitorsRoute().handler(routeContext as any);

    it('reports only the saved connections that have allowed hosts, in one scan', async () => {
      const { routeContext } = setup({
        monitors,
        globalParams,
        connections: [
          { name: 'prod', config: { ...storedConfig, allowedMonitorHosts: ['api.example.com'] } },
          { name: 'staging', config: storedConfig },
        ],
      });

      const result = (await getAffected(routeContext)) as any;

      expect(Object.keys(result)).toEqual(['prod']);
      expect(result.prod.total).toBe(5);
      expect(routeContext.monitorConfigRepository.findDecryptedMonitors).toHaveBeenCalledTimes(1);
    });

    it('does not scan monitors when no connection has allowed hosts', async () => {
      const { routeContext } = setup({
        monitors,
        connections: [{ name: 'prod', config: storedConfig }],
      });

      expect(await getAffected(routeContext)).toEqual({});
      expect(routeContext.monitorConfigRepository.findDecryptedMonitors).not.toHaveBeenCalled();
    });

    it('responds 404 while secret connections are disabled', async () => {
      const { routeContext, response } = setup({ secretConnections: { enabled: false } });

      await getAffected(routeContext);

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: SECRET_CONNECTIONS_DISABLED_MESSAGE },
      });
    });
  });
});
