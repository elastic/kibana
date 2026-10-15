/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import {
  NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID,
  NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
} from '../saved_objects';
import {
  createSandboxElasticsearchAccessClient,
  SandboxElasticsearchAccessDisabledError,
} from './sandbox_elasticsearch_access_client';

const CONFIG = {
  enabled: true,
  serviceAccountName: 'nightshift-sandbox',
  roles: ['nightshift'],
  assumerServiceAccountId: 'sandbox-api',
};

const STORED = { serviceAccountId: 'stored-sa', createdAt: '2026-10-15T00:00:00.000Z' };

const notFound = () =>
  SavedObjectsErrorHelpers.createGenericNotFoundError(
    NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
    NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID
  );

const storedObject = (attributes = STORED) => ({
  id: NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID,
  type: NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
  references: [],
  attributes,
});

const setup = ({ config = CONFIG, serviceAccountsEnabled = true } = {}) => {
  const core = coreMock.createStart();
  jest.mocked(core.security.serviceAccounts.isEnabled).mockReturnValue(serviceAccountsEnabled);
  jest.mocked(core.security.serviceAccounts.create).mockResolvedValue({
    id: 'new-sa',
    name: CONFIG.serviceAccountName,
    roles: CONFIG.roles,
  });
  const savedObjects = savedObjectsServiceMock.createStartContract();
  const repository = savedObjectsRepositoryMock.create();
  savedObjects.createInternalRepository.mockReturnValue(repository);
  const logger = loggingSystemMock.createLogger();
  const client = createSandboxElasticsearchAccessClient({
    getDeps: () => ({ savedObjects, security: core.security }),
    config,
    logger,
  });
  return { client, repository, create: core.security.serviceAccounts.create, logger };
};

describe('createSandboxElasticsearchAccessClient', () => {
  const request = httpServerMock.createKibanaRequest();

  it('returns the stored account without creating one', async () => {
    const { client, repository, create } = setup();
    repository.get.mockResolvedValue(storedObject());

    await expect(client.ensure(request)).resolves.toEqual(STORED);
    expect(create).not.toHaveBeenCalled();
    expect(repository.get).toHaveBeenCalledWith(
      NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
      NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID
    );
  });

  it('creates an account assumable by sandbox-api and stores its id', async () => {
    const { client, repository, create } = setup();
    repository.get.mockRejectedValue(notFound());

    const access = await client.ensure(request);

    expect(create).toHaveBeenCalledWith(request, {
      name: 'nightshift-sandbox',
      description: expect.any(String),
      roles: ['nightshift'],
      assumableByPlatformServiceAccounts: ['sandbox-api'],
    });
    expect(access).toEqual({ serviceAccountId: 'new-sa', createdAt: expect.any(String) });
    expect(repository.create).toHaveBeenCalledWith(NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE, access, {
      id: NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID,
      overwrite: false,
    });
    await expect(client.getServiceAccountId()).resolves.toBe('new-sa');
  });

  it('shares one create between concurrent callers', async () => {
    const { client, repository, create } = setup();
    repository.get.mockRejectedValue(notFound());

    await Promise.all([client.ensure(request), client.ensure(request)]);

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('returns the concurrently stored account when the write conflicts', async () => {
    const { client, repository, logger } = setup();
    repository.get.mockRejectedValueOnce(notFound()).mockResolvedValueOnce(storedObject());
    repository.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError(
        NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_TYPE,
        NIGHTSHIFT_SANDBOX_ES_ACCESS_SO_ID
      )
    );

    await expect(client.ensure(request)).resolves.toEqual(STORED);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[new-sa] is unused'));
  });

  it('refuses to create an account when UIAM mode is disabled', async () => {
    const { client, create } = setup({ config: { ...CONFIG, enabled: false } });

    await expect(client.ensure(request)).rejects.toBeInstanceOf(
      SandboxElasticsearchAccessDisabledError
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses to create an account when service accounts are disabled', async () => {
    const { client, repository, create } = setup({ serviceAccountsEnabled: false });
    repository.get.mockRejectedValue(notFound());

    await expect(client.ensure(request)).rejects.toThrow('xpack.security.serviceAccounts.enabled');
    expect(create).not.toHaveBeenCalled();
  });

  it('caches a found service account id', async () => {
    const { client, repository } = setup();
    repository.get.mockResolvedValue(storedObject());

    await expect(client.getServiceAccountId()).resolves.toBe('stored-sa');
    await expect(client.getServiceAccountId()).resolves.toBe('stored-sa');
    expect(repository.get).toHaveBeenCalledTimes(1);
  });

  it('reports no service account before one is created', async () => {
    const { client, repository } = setup();
    repository.get.mockRejectedValue(notFound());

    await expect(client.getServiceAccountId()).resolves.toBeUndefined();
    await expect(client.get()).resolves.toBeUndefined();
  });
});
