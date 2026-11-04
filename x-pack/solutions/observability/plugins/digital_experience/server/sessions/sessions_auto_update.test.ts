/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { SessionsStatus } from '../../common/sessions';
import type { SessionsApiKey, SessionsApiKeys } from './sessions_api_key';
import {
  enableSessionsForUser,
  updateSessionsWithApiKey,
  withApiKeyStatus,
} from './sessions_auto_update';
import { checkSessionsPrivileges, installSessions } from './sessions_setup';
import { SessionsPrivilegesError } from './sessions_privileges_error';

jest.mock('./sessions_setup');

const settings = { frequency: '1m', partitions: 1 };
const NOW = new Date('2026-11-04T10:00:00.000Z');

const keyOf = (id: string): SessionsApiKey => ({
  id,
  name: 'Digital Experience sessions',
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
    apiKeyName: 'Digital Experience sessions',
    serviceAccount: null,
  },
  transforms: [],
};

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
    grant: jest.fn(() =>
      granted instanceof Error ? Promise.reject(granted) : Promise.resolve(granted)
    ),
    save: jest.fn(),
    delete: jest.fn(),
    invalidate: jest.fn(),
    isValid: jest.fn().mockResolvedValue(valid),
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
        now: NOW,
      });
      return { esClient, request, result };
    };

    it('checks the user, then installs with a new key, stores it and invalidates the old one', async () => {
      const { apiKeys, typed, keyClient } = createApiKeys({ stored: keyOf('old') });
      const { esClient, request, result } = run(typed);

      expect(await result).toEqual(keyOf('new'));
      expect(checkSessionsPrivileges).toHaveBeenCalledWith(esClient.asCurrentUser);
      expect(apiKeys.grant).toHaveBeenCalledWith(request, { grantedBy: 'ana', now: NOW });
      expect(apiKeys.clusterClientFor).toHaveBeenCalledWith(keyOf('new'));
      expect(installSessions).toHaveBeenCalledWith({
        esClient: keyClient,
        logger,
        settings,
        enabled: { enabledBy: 'ana', enabledAt: NOW.toISOString() },
      });
      expect(apiKeys.save).toHaveBeenCalledWith(keyOf('new'));
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

    it('keeps the new key in use, and drops the old one, when storing it fails', async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });
      apiKeys.save.mockRejectedValue(new Error('Bad Request'));

      expect(await run(typed).result).toEqual(keyOf('new'));
      expect(apiKeys.invalidate).not.toHaveBeenCalledWith(keyOf('new'));
      expect(apiKeys.delete).toHaveBeenCalled();
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('old'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Bad Request'));
    });

    it("installs with the user's credentials when keys can't be stored", async () => {
      const { apiKeys, typed } = createApiKeys({ available: false });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(apiKeys.grant).not.toHaveBeenCalled();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.save).not.toHaveBeenCalled();
    });

    it("falls back to the user's credentials, and drops the stored key, when granting fails", async () => {
      const { apiKeys, typed } = createApiKeys({
        stored: keyOf('old'),
        granted: new Error('Unsupported scheme'),
      });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.delete).toHaveBeenCalled();
      expect(apiKeys.invalidate).toHaveBeenCalledWith(keyOf('old'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unsupported scheme'));
    });

    it("falls back to the user's credentials when API keys are disabled", async () => {
      const { apiKeys, typed } = createApiKeys({ granted: null });
      const { esClient, result } = run(typed);

      expect(await result).toBeNull();
      expect(installSessions).toHaveBeenCalledWith(expect.objectContaining({ esClient }));
      expect(apiKeys.save).not.toHaveBeenCalled();
    });
  });

  describe('withApiKeyStatus', () => {
    it('leaves the status alone without a stored key', async () => {
      const { typed } = createApiKeys();

      expect(await withApiKeyStatus(status, typed)).toBe(status);
    });

    it('leaves the status alone when the transforms run with other credentials', async () => {
      const { typed } = createApiKeys({ stored: keyOf('other') });

      expect(await withApiKeyStatus(status, typed)).toBe(status);
    });

    it('marks an update as automatic when the transforms run with the stored key', async () => {
      const { apiKeys, typed } = createApiKeys({ stored: keyOf('old') });

      expect(await withApiKeyStatus(status, typed)).toEqual({ ...status, autoUpdate: true });
      expect(apiKeys.isValid).toHaveBeenCalledWith(keyOf('old'));
    });

    it('reports a deleted key before the transforms fail', async () => {
      const { typed } = createApiKeys({ stored: keyOf('old'), valid: false });
      const healthy = { ...status, health: 'healthy' as const, needsUpdate: false };

      expect(await withApiKeyStatus(healthy, typed)).toEqual({
        ...healthy,
        needsUpdate: true,
        apiKeyInvalid: true,
        reason: expect.stringContaining('was invalidated or has expired'),
      });
    });

    it('explains failing transforms by an invalidated key and asks for an update', async () => {
      const { typed } = createApiKeys({ stored: keyOf('old'), valid: false });
      const degraded = { ...status, health: 'degraded' as const, needsUpdate: false };

      expect(await withApiKeyStatus(degraded, typed)).toEqual({
        ...degraded,
        needsUpdate: true,
        apiKeyInvalid: true,
        reason: expect.stringContaining('was invalidated or has expired'),
      });
    });

    it('keeps the automatic update when failing transforms still have a valid key', async () => {
      const { typed } = createApiKeys({ stored: keyOf('old') });
      const degraded = { ...status, health: 'degraded' as const };

      expect(await withApiKeyStatus(degraded, typed)).toEqual({ ...degraded, autoUpdate: true });
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
          message:
            'Updated Digital Experience sessions with API key [Digital Experience sessions] granted by user [ana]',
          event: expect.objectContaining({
            action: 'digital_experience_sessions_auto_update',
            outcome: 'success',
          }),
        })
      );
    });

    it('does nothing without a stored key the transforms run with', async () => {
      const { typed } = createApiKeys({ stored: keyOf('other') });

      expect(
        await updateSessionsWithApiKey({
          status,
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
