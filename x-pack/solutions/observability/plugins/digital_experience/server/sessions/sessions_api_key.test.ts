/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  SESSIONS_API_KEY_NAME,
  SESSIONS_API_KEY_SO_ID,
  SESSIONS_API_KEY_SO_TYPE,
  SessionsApiKeys,
  sessionsApiKeyEncryptionParams,
} from './sessions_api_key';

const key = {
  id: 'key-1',
  name: SESSIONS_API_KEY_NAME,
  apiKey: 'secret',
  grantedBy: 'ana',
  grantedAt: '2026-11-04T10:00:00.000Z',
};

const esError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    warnings: null,
    meta: {} as never,
  });

const setup = ({
  canEncrypt = true,
  hasTaskManager = true,
}: { canEncrypt?: boolean; hasTaskManager?: boolean } = {}) => {
  const core = coreMock.createStart();
  const esoStart = encryptedSavedObjectsMock.createStart();
  const esoClient = encryptedSavedObjectsMock.createClient();
  esoStart.getClient.mockReturnValue(esoClient);
  const soClient = core.savedObjects.getUnsafeInternalClient();
  const logger = loggingSystemMock.createLogger();
  const apiKeys = new SessionsApiKeys({
    logger,
    encryptedSavedObjects: encryptedSavedObjectsMock.createSetup({ canEncrypt }),
    hasTaskManager,
    getStartServices: async () => ({ core, encryptedSavedObjects: esoStart }),
  });
  return { apiKeys, core, esoStart, esoClient, soClient, logger };
};

describe('SessionsApiKeys', () => {
  it('encrypts the key, bound to every other attribute', () => {
    expect(sessionsApiKeyEncryptionParams).toEqual({
      type: SESSIONS_API_KEY_SO_TYPE,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['id', 'name', 'grantedBy', 'grantedAt']),
    });
  });

  it('stores the key under a UUID, as encrypted saved objects require for predefined ids', () => {
    expect(SESSIONS_API_KEY_SO_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('is only available with an encryption key and the health task that uses the key', () => {
    expect(setup().apiKeys.available).toBe(true);
    expect(setup({ canEncrypt: false }).apiKeys.available).toBe(false);
    expect(setup({ hasTaskManager: false }).apiKeys.available).toBe(false);
  });

  it('grants a key that can only read the source data and write the sessions index', async () => {
    const { apiKeys, core } = setup();
    jest.mocked(core.security.authc.apiKeys.grantAsInternalUser).mockResolvedValue({
      id: 'key-1',
      name: SESSIONS_API_KEY_NAME,
      api_key: 'secret',
    });
    const request = httpServerMock.createKibanaRequest();

    expect(
      await apiKeys.grant(request, { grantedBy: 'ana', now: new Date(key.grantedAt) })
    ).toEqual(key);
    expect(core.security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(request, {
      name: SESSIONS_API_KEY_NAME,
      role_descriptors: {
        digital_experience_sessions: {
          cluster: [],
          indices: [
            {
              names: ['traces-*.otel-*', 'logs-*.otel-*'],
              privileges: ['read', 'view_index_metadata'],
            },
            {
              names: ['digital-experience-sessions-*'],
              privileges: ['read', 'index', 'create_index', 'delete', 'delete_index'],
            },
          ],
        },
      },
      metadata: expect.objectContaining({ managed: true, managed_by: 'digital_experience' }),
    });
  });

  it('returns null when API keys are disabled', async () => {
    const { apiKeys, core } = setup();
    jest.mocked(core.security.authc.apiKeys.grantAsInternalUser).mockResolvedValue(null);

    expect(
      await apiKeys.grant(httpServerMock.createKibanaRequest(), {
        grantedBy: 'ana',
        now: new Date(),
      })
    ).toBeNull();
  });

  it('decrypts the stored key', async () => {
    const { apiKeys, esoStart, esoClient } = setup();
    esoClient.getDecryptedAsInternalUser.mockResolvedValue({
      attributes: key,
      version: 'v1',
    } as never);

    expect(await apiKeys.get()).toEqual(key);
    expect(await apiKeys.getStored()).toEqual({ key, version: 'v1' });
    expect(esoStart.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: [SESSIONS_API_KEY_SO_TYPE],
    });
    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      SESSIONS_API_KEY_SO_TYPE,
      SESSIONS_API_KEY_SO_ID
    );
  });

  it('has no key without an encryption key, when none is stored, or when it cannot be decrypted', async () => {
    const unavailable = setup({ canEncrypt: false });
    expect(await unavailable.apiKeys.get()).toBeNull();
    expect(unavailable.esoClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();

    const missing = setup();
    missing.esoClient.getDecryptedAsInternalUser.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(SESSIONS_API_KEY_SO_TYPE)
    );
    expect(await missing.apiKeys.get()).toBeNull();

    const undecryptable = setup();
    undecryptable.esoClient.getDecryptedAsInternalUser.mockRejectedValue(new Error('bad key'));
    undecryptable.esoStart.isEncryptionError.mockReturnValue(true);
    expect(await undecryptable.apiKeys.get()).toBeNull();
    // Still stored, so an enable overwrites it.
    expect(await undecryptable.apiKeys.getStored()).toEqual({ key: null, version: undefined });
    expect(undecryptable.logger.warn).toHaveBeenCalledWith(expect.stringContaining('bad key'));
  });

  it('stores one key per cluster, replacing the previous one only if nothing replaced it since', async () => {
    const { apiKeys, soClient } = setup();

    await apiKeys.save(key, { key: { ...key, id: 'key-0' }, version: 'v1' });
    expect(soClient.create).toHaveBeenCalledWith(SESSIONS_API_KEY_SO_TYPE, key, {
      id: SESSIONS_API_KEY_SO_ID,
      overwrite: true,
      version: 'v1',
    });

    await apiKeys.save(key, null);
    expect(soClient.create).toHaveBeenLastCalledWith(SESSIONS_API_KEY_SO_TYPE, key, {
      id: SESSIONS_API_KEY_SO_ID,
      overwrite: false,
      version: undefined,
    });
  });

  it('logs instead of throwing when invalidating fails', async () => {
    const { apiKeys, core, logger } = setup();
    jest
      .mocked(core.security.authc.apiKeys.invalidateAsInternalUser)
      .mockRejectedValue(new Error('gone'));

    await expect(apiKeys.invalidate(key)).resolves.toBeUndefined();
    expect(core.security.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['key-1'],
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('gone'));
  });

  it('only counts a key as invalidated when Elasticsearch refuses it', async () => {
    const { apiKeys, core } = setup();
    const keyClient = elasticsearchServiceMock.createScopedClusterClient();
    jest.mocked(core.elasticsearch.client.asScoped).mockReturnValue(keyClient);
    const authenticate = jest.mocked(keyClient.asCurrentUser.security.authenticate);

    expect(await apiKeys.isInvalidated(key)).toBe(false);

    authenticate.mockRejectedValueOnce(esError(401));
    expect(await apiKeys.isInvalidated(key)).toBe(true);

    // A timeout or an unavailable cluster says nothing about the key.
    authenticate.mockRejectedValueOnce(esError(503));
    expect(await apiKeys.isInvalidated(key)).toBe(false);
  });

  it('scopes a cluster client to the key', async () => {
    const { apiKeys, core } = setup();

    await apiKeys.clusterClientFor(key);

    const [request] = jest.mocked(core.elasticsearch.client.asScoped).mock.calls[0];
    expect(request.headers.authorization).toBe(
      `ApiKey ${Buffer.from('key-1:secret').toString('base64')}`
    );
  });
});
