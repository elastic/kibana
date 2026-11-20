/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AuditLogger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { SessionsStatus } from '../../common/sessions';
import type { SessionsApiKey, SessionsApiKeys } from './sessions_api_key';
import { SESSIONS_API_KEY_NAME } from './sessions_api_key';
import {
  enableSessionsForUser,
  getApiKeyStatus,
  updateSessionsWithApiKey,
} from './sessions_auto_update';
import { checkSessionsPrivileges, installSessions } from './sessions_setup';
import { SessionsPrivilegesError } from './sessions_privileges_error';

jest.mock('./sessions_setup');

const settings = { frequency: '1m', partitions: 1 };
const NOW = new Date('2026-11-04T10:00:00.000Z');

const keyOf = (id: string): SessionsApiKey => ({
  id,
  name: SESSIONS_API_KEY_NAME,
  apiKey: `secret-${id}`,
  grantedBy: 'ana',
  grantedAt: '2026-10-27T11:00:00.000Z',
});

const status: SessionsStatus = {
  installed: true,
  health: 'outdated',
  state: 'started',
  installedVersion: 0,
  currentVersion: 1,
  needsUpdate: true,
  autoUpdate: false,
  apiKeyInvalid: false,
  rebuilding: false,
  reason: 'Sessions transforms are from version 0.',
  lagSeconds: 30,
  configured: settings,
  installedPartitions: 0,
  enabledBy: 'ana',
  enabledAt: '2026-10-27T11:00:00.000Z',
  authorization: {
    roles: null,
    apiKeyId: 'old',
    apiKeyName: SESSIONS_API_KEY_NAME,
    serviceAccount: null,
  },
  transforms: [],
};

const asUser = {
  ...status,
  authorization: { roles: ['admin'], apiKeyId: null, apiKeyName: null, serviceAccount: null },
};

const transformOn = (apiKeyId: string) => ({
  id: `transform-${apiKeyId}`,
  partition: 0,
  version: 1,
  frequency: '1m',
  state: 'started',
  health: 'healthy' as const,
  lagSeconds: 30,
  reason: null,
  enabledBy: 'ana',
  enabledAt: '2026-10-27T11:00:00.000Z',
  authorization: { roles: null, apiKeyId, apiKeyName: SESSIONS_API_KEY_NAME, serviceAccount: null },
});

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'error' } },
    headers: {},
    warnings: [],
    meta: {} as errors.ResponseError['meta']['meta'],
  });

const createAuditLogger = () => ({
  log: jest.fn() as jest.MockedFunction<AuditLogger['log']>,
  enabled: true,
  includeSavedObjectNames: false,
});

const createApiKeys = ({
  available = true,
  stored = null,
  granted = keyOf('new'),
  valid = true,
}: {
  available?: boolean;
  stored?: SessionsApiKey | null;
  granted?: SessionsApiKey | null | Error;
  valid?: boolean;
} = {}) => {
  const keyClient = elasticsearchServiceMock.createScopedClusterClient();
  const apiKeys = {
    available,
    get: jest.fn().mockResolvedValue(stored),
    getStored: jest.fn().mockResolvedValue(stored ? { key: stored, version: 'v1' } : null),
    grant: jest.fn(() =>
      granted instanceof Error ? Promise.reject(granted) : Promise.resolve(granted)
    ),
    save: jest.fn(),
    delete: jest.fn(),
    invalidate: jest.fn(),
    isInvalidated: jest.fn().mockResolvedValue(!valid),
    clusterClientFor: jest.fn().mockResolvedValue(keyClient),
  };
  return { apiKeys, typed: apiKeys as unknown as SessionsApiKeys, keyClient };
};

describe('sessions auto update', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('enableSessionsForUser', () => {
    const run = (typed: SessionsApiKeys) => {
      const esClient = elasticsearchServiceMock.createScopedClusterClient();
      const request = httpServerMock.createKibanaRequest();
      const result = enableSessionsForUser({
        esClient,
        apiKeys: typed,
        request,
        logger,
        settings,
        enabledBy: 'ana',
        isServerless: true,
        now: NOW,
      });
      return { esClient, request, result };
    };

    it('checks the user, then installs with a new key, stores it and invalidates the old one', async () => {
      const { apiKeys, typed, keyClient } = createApiKeys({ stored: keyOf('old') });
      const { esClient, request, result } = run(typed);

      expect(await result).toEqual(keyOf('new'));
      expect(checkSessionsPrivileges).toHaveBeenCalledWith(esClient.asCurrentUser, {
        isServerless: true,
      });
      expect(apiKeys.grant).toHaveBeenCalledWith(request, { grantedBy: 'ana', now: NOW });
      expect(apiKeys.clusterClientFor).toHaveBeenCalledWith(keyOf('new'));
      expect(installSessions).toHaveBeenCalledWith({
        esClient: keyClient,
        logger,
        settings,
        enabled: { enabledBy: 'ana', enabledAt: NOW.toISOString() },
      });
      expect(apiKeys.save).toHaveBeenCalledWith(keyOf('new'), { key: keyOf('old'), version: 'v1' });
      expect(apiKeys.invalidate).toHaveBeenCalledTimes(1);
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('old'));
    });

    it('grants nothing when the user lacks privileges', async () => {
      jest
        .mocked(checkSessionsPrivileges)
        .mockRejectedValue(new SessionsPrivilegesError(['cluster:manage_transform']));
      const { apiKeys, typed } = createApiKeys();

      await expect(run(typed).result).rejects.toBeInstanceOf(SessionsPrivilegesError);
      expect(apiKeys.grant).not.toHaveBeenCalled();
      expect(installSessions).not.toHaveBeenCalled();
    });

    it('invalidates the new key, and keeps the stored one, when installing fails', async () => {
      jest.mocked(installSessions).mockRejectedValue(new Error('boom'));
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });

      await expect(run(typed).result).rejects.toThrow('boom');
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('new'));
      expect(apiKeys.invalidate).not.toHaveBeenCalledWith(keyOf('old'));
      expect(apiKeys.save).not.toHaveBeenCalled();
    });

    it('drops both keys when storing the new one fails, as nothing would track it', async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });
      apiKeys.save.mockRejectedValue(new Error('Bad Request'));

      expect(await run(typed).result).toBeNull();
      expect(installSessions).toHaveBeenCalled();
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('new'));
      expect(apiKeys.delete).toHaveBeenCalled();
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('old'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Bad Request'));
    });

    it('keeps the key an enable at the same time stored, and drops its own', async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });
      apiKeys.save.mockRejectedValue(
        SavedObjectsErrorHelpers.createConflictError('digital-experience-sessions-api-key', 'id')
      );

      expect(await run(typed).result).toBeNull();
      expect(apiKeys.invalidate).toHaveBeenCalledTimes(1);
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('new'));
      expect(apiKeys.delete).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("installs with the user's credentials when keys can't be stored", async () => {
      const { apiKeys, typed } = createApiKeys({ available: false });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(apiKeys.grant).not.toHaveBeenCalled();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.save).not.toHaveBeenCalled();
    });

    it("falls back to the user's credentials, and drops the stored key, when the user can't grant keys", async () => {
      const { apiKeys, typed } = createApiKeys({
        stored: keyOf('old'),
        granted: new Error('Unsupported scheme "ApiKey" for granting API Key'),
      });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.delete).toHaveBeenCalled();
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('old'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unsupported scheme'));
    });

    it("falls back to the user's credentials when Elasticsearch refuses to grant keys", async () => {
      const { apiKeys, typed } = createApiKeys({ granted: responseError(400) });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.save).not.toHaveBeenCalled();
    });

    it.each([
      ['Elasticsearch fails', responseError(503)],
      ['Elasticsearch is unreachable', new errors.ConnectionError('connect ECONNREFUSED')],
    ])('fails without changing anything when granting fails because %s', async (_, error) => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old'), granted: error });

      await expect(run(typed).result).rejects.toBe(error);
      expect(installSessions).not.toHaveBeenCalled();
      expect(apiKeys.delete).not.toHaveBeenCalled();
      expect(apiKeys.invalidate).not.toHaveBeenCalled();
    });

    it("falls back to the user's credentials when security is disabled", async () => {
      const { apiKeys, typed } = createApiKeys({ granted: null });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.save).not.toHaveBeenCalled();
    });
  });

  describe('getApiKeyStatus', () => {
    const statusWithKey = async (...args: Parameters<typeof getApiKeyStatus>) =>
      (await getApiKeyStatus(...args)).status;

    const check = { checkKey: true, logger };

    it('leaves the status alone without a stored key', async () => {
      const { typed } = createApiKeys();

      expect(await statusWithKey(status, typed, check)).toBe(status);
    });

    it('leaves the status alone when the transforms run with other credentials', async () => {
      const { typed } = createApiKeys({ stored: keyOf('other') });

      expect(await statusWithKey(asUser, typed, check)).toBe(asUser);
    });

    it('marks an update as automatic when the transforms run with another sessions key', async () => {
      const { typed } = createApiKeys({ stored: keyOf('other') });

      expect(await statusWithKey(status, typed, check)).toEqual({ ...status, autoUpdate: true });
    });

    it("doesn't check a key the health task found invalidated again", async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });

      expect(
        await statusWithKey(status, typed, {
          checkKey: true,
          logger,
          getAutoUpdateState: async () => ({ invalidApiKeyId: 'old' }),
        })
      ).toEqual({ ...status, apiKeyInvalid: true, reason: expect.stringContaining('invalidated') });
      expect(apiKeys.isInvalidated).not.toHaveBeenCalled();
    });

    it('checks a newer key than the one the health task found invalidated', async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });

      expect(
        await statusWithKey(status, typed, {
          checkKey: true,
          logger,
          getAutoUpdateState: async () => ({ invalidApiKeyId: 'older' }),
        })
      ).toEqual({ ...status, autoUpdate: true });
      expect(apiKeys.isInvalidated).toHaveBeenCalled();
    });

    it('reads what the health task found only when the transforms run with the stored key', async () => {
      const { typed } = createApiKeys();
      const getAutoUpdateState = jest.fn();

      await statusWithKey(status, typed, { checkKey: false, logger, getAutoUpdateState });
      expect(getAutoUpdateState).not.toHaveBeenCalled();
    });

    it("leaves the status alone, and logs, when the key can't be read", async () => {
      const { apiKeys, typed } = createApiKeys();
      apiKeys.get.mockRejectedValue(new Error('index unavailable'));

      expect(await statusWithKey(status, typed, check)).toBe(status);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('index unavailable'));
    });

    it('marks an update as automatic when the transforms run with a working stored key', async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });

      expect(await getApiKeyStatus(status, typed, check)).toEqual({
        status: { ...status, autoUpdate: true },
        keyId: 'old',
      });
      expect(apiKeys.isInvalidated).toHaveBeenCalledWith(keyOf('old'));
    });

    it('only turns automatic updates off for a deleted key, as the transforms keep running', async () => {
      const { typed } = createApiKeys({ stored: keyOf('old'), valid: false });
      const healthy = { ...status, health: 'healthy' as const, needsUpdate: false, reason: null };

      expect(await statusWithKey(healthy, typed, check)).toEqual({
        ...healthy,
        apiKeyInvalid: true,
      });
    });

    it("explains that a needed update can't apply automatically with a deleted key", async () => {
      const { typed } = createApiKeys({ stored: keyOf('old'), valid: false });

      expect(await statusWithKey(status, typed, check)).toEqual({
        ...status,
        apiKeyInvalid: true,
        reason: expect.stringContaining("so this update can't apply automatically"),
      });
    });

    it('shows a failing automatic update as one a user must apply, without its details', async () => {
      const { typed } = createApiKeys({ stored: keyOf('old') });

      expect(
        await statusWithKey(status, typed, {
          checkKey: true,
          logger,
          getAutoUpdateState: async () => ({
            autoUpdateError: 'security_exception: user [ana] lacks [manage_transform]',
          }),
        })
      ).toEqual({
        ...status,
        autoUpdate: false,
        reason: expect.stringContaining('The last automatic update'),
      });
    });

    it('ignores an old automatic update failure when no update is pending', async () => {
      const { typed } = createApiKeys({ stored: keyOf('old') });
      const current = { ...status, needsUpdate: false };

      expect(
        await statusWithKey(current, typed, {
          checkKey: true,
          logger,
          getAutoUpdateState: async () => ({ autoUpdateError: 'boom' }),
        })
      ).toEqual({ ...current, autoUpdate: true });
    });

    it("doesn't check the key unless asked", async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old'), valid: false });

      expect(await statusWithKey(status, typed, { checkKey: false, logger })).toEqual({
        ...status,
        autoUpdate: true,
      });
      expect(apiKeys.isInvalidated).not.toHaveBeenCalled();
    });
  });

  describe('updateSessionsWithApiKey', () => {
    it('reinstalls with the same key, keeps the enable stamp, and audits it', async () => {
      const { apiKeys, typed, keyClient } = createApiKeys({ stored: keyOf('old') });
      const audit = createAuditLogger();

      expect(
        await updateSessionsWithApiKey({ status, apiKeys: typed, logger, audit, settings })
      ).toBe(true);
      expect(apiKeys.clusterClientFor).toHaveBeenCalledWith(keyOf('old'));
      expect(installSessions).toHaveBeenCalledWith({
        esClient: keyClient,
        logger,
        settings,
        enabled: { enabledBy: 'ana', enabledAt: '2026-10-27T11:00:00.000Z' },
      });
      expect(checkSessionsPrivileges).not.toHaveBeenCalled();
      expect(apiKeys.grant).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Updated Digital Experience sessions with API key [${SESSIONS_API_KEY_NAME}] (old) granted by user [ana]`,
          event: expect.objectContaining({
            action: 'digital_experience_sessions_auto_update',
            outcome: 'success',
          }),
        })
      );
    });

    it('moves transforms left on another sessions key to the stored one', async () => {
      const { apiKeys, typed, keyClient } = createApiKeys({ stored: keyOf('new') });
      const current = {
        ...status,
        needsUpdate: false,
        authorization: transformOn('new').authorization,
        transforms: [transformOn('new'), transformOn('stray')],
      };

      expect(
        await updateSessionsWithApiKey({
          status: current,
          apiKeys: typed,
          logger,
          audit: createAuditLogger(),
          settings,
        })
      ).toBe(true);
      expect(installSessions).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: keyClient })
      );
      expect(apiKeys.invalidate).toHaveBeenCalledWith({ id: 'stray', name: SESSIONS_API_KEY_NAME });
    });

    it('does nothing when no update is needed and every transform runs with the stored key', async () => {
      const { typed } = createApiKeys({ stored: keyOf('new') });

      expect(
        await updateSessionsWithApiKey({
          status: {
            ...status,
            needsUpdate: false,
            authorization: transformOn('new').authorization,
            transforms: [transformOn('new')],
          },
          apiKeys: typed,
          logger,
          audit: createAuditLogger(),
          settings,
        })
      ).toBe(false);
      expect(installSessions).not.toHaveBeenCalled();
    });

    it('does nothing without a stored key the transforms run with', async () => {
      const { typed } = createApiKeys({ stored: keyOf('other') });

      expect(
        await updateSessionsWithApiKey({
          status: asUser,
          apiKeys: typed,
          logger,
          audit: createAuditLogger(),
          settings,
        })
      ).toBe(false);
      expect(installSessions).not.toHaveBeenCalled();
    });

    it('audits and rethrows a failed update', async () => {
      jest.mocked(installSessions).mockRejectedValue(new Error('unable to authenticate'));
      const { typed } = createApiKeys({ stored: keyOf('old') });
      const audit = createAuditLogger();

      await expect(
        updateSessionsWithApiKey({ status, apiKeys: typed, logger, audit, settings })
      ).rejects.toThrow('unable to authenticate');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { code: 'Error', message: 'unable to authenticate' },
        })
      );
    });
  });
});
