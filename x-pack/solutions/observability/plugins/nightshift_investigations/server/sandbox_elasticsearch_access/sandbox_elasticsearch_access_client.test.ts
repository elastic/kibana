/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  createSandboxElasticsearchAccessClient,
  getSandboxServiceAccountName,
  SANDBOX_ELASTICSEARCH_WORKLOAD_ID,
  SANDBOX_ELASTICSEARCH_WORKLOAD_TYPE,
  SandboxElasticsearchAccessDisabledError,
} from './sandbox_elasticsearch_access_client';

const CONFIG = {
  enabled: true,
  serviceAccountName: 'nightshift-sandbox',
  roles: ['nightshift'],
};

const binding = (
  spaceId: string,
  serviceAccountId = `sa-${spaceId}`
): ServiceAccountWorkloadBinding => ({
  pluginId: 'nightshiftInvestigations',
  workloadType: SANDBOX_ELASTICSEARCH_WORKLOAD_TYPE,
  workloadId: SANDBOX_ELASTICSEARCH_WORKLOAD_ID,
  serviceAccountId,
  spaceId,
  boundBy: { type: 'user', username: 'admin' },
  boundAt: '2026-10-15T00:00:00.000Z',
});

const requestInSpace = (spaceId: string): KibanaRequest =>
  httpServerMock.createKibanaRequest({ headers: { 'x-space': spaceId } });

const setup = ({ config = CONFIG, serviceAccountsEnabled = true } = {}) => {
  const core = coreMock.createStart();
  const serviceAccounts = jest.mocked(core.security.serviceAccounts);
  serviceAccounts.isEnabled.mockReturnValue(serviceAccountsEnabled);
  serviceAccounts.getWorkloadBinding.mockResolvedValue(null);
  serviceAccounts.create.mockImplementation(async (_request, { name, roles }) => ({
    id: `new-${name}`,
    name,
    roles,
  }));
  serviceAccounts.bindWorkload.mockImplementation(async (request, { serviceAccountId }) =>
    binding(String(request.headers['x-space']), serviceAccountId)
  );
  const logger = loggingSystemMock.createLogger();
  const client = createSandboxElasticsearchAccessClient({
    getDeps: () => ({ security: core.security }),
    getSpaceId: (request) => String(request.headers['x-space']),
    config,
    logger,
  });
  return { client, serviceAccounts };
};

describe('createSandboxElasticsearchAccessClient', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('returns the binding of the request space without creating an account', async () => {
    const { client, serviceAccounts } = setup();
    serviceAccounts.getWorkloadBinding.mockResolvedValue(binding('space-a', 'bound-sa'));

    await expect(client.ensure(requestInSpace('space-a'))).resolves.toEqual({
      serviceAccountId: 'bound-sa',
      spaceId: 'space-a',
      boundAt: '2026-10-15T00:00:00.000Z',
    });
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledWith({
      workloadType: 'sandbox_elasticsearch',
      workloadId: 'default',
      spaceId: 'space-a',
    });
    expect(serviceAccounts.create).not.toHaveBeenCalled();
    expect(serviceAccounts.bindWorkload).not.toHaveBeenCalled();
  });

  it('creates an account assumable by sandbox-api and binds it in the request space', async () => {
    const { client, serviceAccounts } = setup();
    const request = requestInSpace('space-a');

    const access = await client.ensure(request);

    expect(serviceAccounts.create).toHaveBeenCalledWith(request, {
      name: 'nightshift-sandbox-space-a',
      description: expect.stringContaining('[space-a]'),
      roles: ['nightshift'],
      platformAssumers: ['sandbox'],
    });
    expect(serviceAccounts.bindWorkload).toHaveBeenCalledWith(request, {
      workloadType: 'sandbox_elasticsearch',
      workloadId: 'default',
      serviceAccountId: 'new-nightshift-sandbox-space-a',
    });
    expect(access).toEqual({
      serviceAccountId: 'new-nightshift-sandbox-space-a',
      spaceId: 'space-a',
      boundAt: expect.any(String),
    });
    await expect(client.getServiceAccountId(request)).resolves.toBe(
      'new-nightshift-sandbox-space-a'
    );
    // Served from the cache filled by the bind.
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledTimes(1);
  });

  it('shares one create between concurrent callers of a space, not across spaces', async () => {
    const { client, serviceAccounts } = setup();

    await Promise.all([
      client.ensure(requestInSpace('space-a')),
      client.ensure(requestInSpace('space-a')),
      client.ensure(requestInSpace('space-b')),
    ]);

    expect(serviceAccounts.create).toHaveBeenCalledTimes(2);
    expect(serviceAccounts.bindWorkload).toHaveBeenCalledTimes(2);
  });

  it('refuses to create an account when UIAM mode is disabled', async () => {
    const { client, serviceAccounts } = setup({ config: { ...CONFIG, enabled: false } });

    await expect(client.ensure(requestInSpace('space-a'))).rejects.toBeInstanceOf(
      SandboxElasticsearchAccessDisabledError
    );
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('refuses to create an account when service accounts are disabled', async () => {
    const { client, serviceAccounts } = setup({ serviceAccountsEnabled: false });

    await expect(client.ensure(requestInSpace('space-a'))).rejects.toThrow(
      'xpack.security.serviceAccounts.enabled'
    );
    expect(serviceAccounts.create).not.toHaveBeenCalled();
  });

  it('caches a found service account id per space for a minute', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-15T00:00:00.000Z') });
    const { client, serviceAccounts } = setup();
    serviceAccounts.getWorkloadBinding.mockImplementation(async ({ spaceId }) => binding(spaceId));

    await expect(client.getServiceAccountId(requestInSpace('space-a'))).resolves.toBe('sa-space-a');
    await expect(client.getServiceAccountId(requestInSpace('space-a'))).resolves.toBe('sa-space-a');
    await expect(client.getServiceAccountId(requestInSpace('space-b'))).resolves.toBe('sa-space-b');
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(60_001);
    await client.getServiceAccountId(requestInSpace('space-a'));
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledTimes(3);
  });

  it('reports no service account before one is bound, without caching the miss', async () => {
    const { client, serviceAccounts } = setup();

    await expect(client.getServiceAccountId(requestInSpace('space-a'))).resolves.toBeUndefined();
    await expect(client.get(requestInSpace('space-a'))).resolves.toBeUndefined();
    expect(serviceAccounts.getWorkloadBinding).toHaveBeenCalledTimes(2);
  });

  it('keeps the account name within the service account name limit', () => {
    expect(getSandboxServiceAccountName('nightshift-sandbox', 'default')).toBe(
      'nightshift-sandbox-default'
    );
    expect(getSandboxServiceAccountName('nightshift-sandbox', 'x'.repeat(200))).toHaveLength(128);
  });
});
