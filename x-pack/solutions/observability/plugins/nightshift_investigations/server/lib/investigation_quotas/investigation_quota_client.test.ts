/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { createInvestigationQuotaClient } from './investigation_quota_client';
import { createInvestigationQuotaRepositoryMock } from './repository.mock';

const setup = ({
  canManage = true,
  hasSecurity = true,
  started = true,
  username = 'jason',
}: {
  canManage?: boolean;
  hasSecurity?: boolean;
  started?: boolean;
  /** The signed-in user, or `null` for a request with no user. */
  username?: string | null;
} = {}) => {
  const repository = createInvestigationQuotaRepositoryMock();
  const { savedObjects } = coreMock.createStart();
  // The saved objects service hands out the in-memory repository, so reads and writes are real.
  savedObjects.createInternalRepository.mockReturnValue(
    Object.assign(savedObjectsRepositoryMock.create(), repository.client)
  );
  const security = securityMock.createStart();
  security.authz.checkPrivilegesWithRequest.mockReturnValue({
    atSpace: jest.fn(),
    atSpaces: jest.fn(),
    globally: jest.fn().mockResolvedValue({ hasAllRequested: canManage }),
  });
  security.authc.getCurrentUser.mockReturnValue(
    username === null ? null : securityMock.createMockAuthenticatedUser({ username })
  );
  const logger = loggingSystemMock.createLogger();
  const client = createInvestigationQuotaClient({
    getDeps: () => ({
      savedObjects: started ? savedObjects : undefined,
      security: hasSecurity ? security : undefined,
    }),
    logger,
  });
  return { client, repository, logger, request: httpServerMock.createKibanaRequest() };
};

describe('investigation quota client', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('update', () => {
    it.each([
      ['lacks manage and configure in all spaces', { canManage: false }],
      ['cannot be checked because security is missing', { hasSecurity: false }],
    ])('refuses with a 403 and writes nothing when the caller %s', async (_reason, options) => {
      const { client, logger, request } = setup(options);

      await expect(client.update(request, { enabled: false })).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect((await client.get(request)).enabled).toBe(true);
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('writes the change and returns the full snapshot for a caller who can manage', async () => {
      const { client, request } = setup();

      const snapshot = await client.update(request, {
        enabled: false,
        limits: { manual_investigation: 7, automatic_investigation: null },
      });

      expect(snapshot).toMatchObject({
        enabled: false,
        limits: { automatic_investigation: null, manual_investigation: 7, total_investigation: 10 },
        counts: { automatic_investigation: 0, manual_investigation: 0, total_investigation: 0 },
        canManage: true,
      });
      expect(await client.get(request)).toEqual(snapshot);
    });
  });

  describe('update logging', () => {
    it('logs who changed the settings with the value before and after for each change', async () => {
      const { client, logger, request } = setup({ username: 'jason' });

      await client.update(request, {
        enabled: false,
        limits: { manual_investigation: 7, automatic_investigation: null },
      });

      expect(logger.info.mock.calls).toEqual([
        [
          'Investigation quota settings changed by jason: enabled true -> false; automatic_investigation 5 -> unlimited; manual_investigation 5 -> 7',
        ],
      ]);
    });

    it('logs each change from the settings as they were just before it', async () => {
      const { client, logger, request } = setup();

      await client.update(request, { limits: { total_investigation: 20 } });
      await client.update(request, { limits: { total_investigation: null } });

      expect(logger.info.mock.calls).toEqual([
        ['Investigation quota settings changed by jason: total_investigation 10 -> 20'],
        ['Investigation quota settings changed by jason: total_investigation 20 -> unlimited'],
      ]);
    });

    it('logs nothing when the update leaves every setting as it was', async () => {
      const { client, logger, request } = setup();

      await client.update(request, { enabled: true, limits: { manual_investigation: 5 } });

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('says the user is unknown when the request has none', async () => {
      const { client, logger, request } = setup({ username: null });

      await client.update(request, { enabled: false });

      expect(logger.info).toHaveBeenCalledWith(
        'Investigation quota settings changed by unknown: enabled true -> false'
      );
    });
  });

  describe('get', () => {
    it('maps each count to its own group, reports the UTC window and who can manage', async () => {
      const { client, repository, request } = setup({ canManage: false });
      repository.seedLedger('2026-08-31', 'automatic_investigation', 3);
      repository.seedLedger('2026-08-31', 'manual_investigation', 5);
      repository.seedLedger('2026-08-31', 'total_investigation', 9);
      repository.seedLedger('2026-08-30', 'manual_investigation', 99);

      expect(await client.get(request)).toEqual({
        enabled: true,
        limits: { automatic_investigation: 5, manual_investigation: 5, total_investigation: 10 },
        counts: { automatic_investigation: 3, manual_investigation: 5, total_investigation: 9 },
        window: {
          start: '2026-08-31T00:00:00.000Z',
          resetsAt: '2026-09-01T00:00:00.000Z',
          timezone: 'UTC',
        },
        canManage: false,
      });
    });
  });

  describe('consume', () => {
    it('charges the UTC day it is called on, so a new day starts a new count', async () => {
      const { client, repository } = setup();
      jest.setSystemTime(new Date('2026-08-31T23:59:59.999Z'));

      await client.consume('manual');
      jest.setSystemTime(new Date('2026-09-01T00:00:00.000Z'));
      await client.consume('manual');

      await expect(repository.count('2026-08-31', 'manual_investigation')).resolves.toBe(1);
      await expect(repository.count('2026-09-01', 'manual_investigation')).resolves.toBe(1);
    });

    it('logs the charge through the client logger', async () => {
      const { client, logger } = setup();

      await client.consume('automatic');

      expect(logger.info).toHaveBeenCalledWith(
        'Investigation quota charged for an automatic start: automatic_investigation 0 -> 1 of 5, total_investigation 0 -> 1 of 10'
      );
    });
  });

  it('throws before the plugin has started', async () => {
    const { client, request } = setup({ started: false });

    for (const call of [
      () => client.get(request),
      () => client.update(request, { enabled: false }),
      () => client.consume('manual'),
    ]) {
      await expect((async () => call())()).rejects.toThrow('start() has not been called');
    }
  });
});
