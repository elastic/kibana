/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { StoredSLOGlobalSettings } from '../../domain/models';
import { DefaultSLOGlobalSettingsRepository } from './slo_global_settings_repository';

const UPDATED_AT = '2026-11-24T10:00:00.000Z';

const aSavedObject = (attributes: StoredSLOGlobalSettings) => ({
  id: 'slo-global-settings-singleton',
  type: 'slo-global-settings',
  references: [],
  attributes,
});

describe('DefaultSLOGlobalSettingsRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let logger: MockedLogger;
  let repository: DefaultSLOGlobalSettingsRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    repository = new DefaultSLOGlobalSettingsRepository(soClient, logger);
  });

  describe('get', () => {
    it('returns no settings when the saved object does not exist', async () => {
      soClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          'slo-global-settings',
          'slo-global-settings-singleton'
        )
      );

      await expect(repository.get()).resolves.toEqual({});
      expect(soClient.get).toHaveBeenCalledWith(
        'slo-global-settings',
        'slo-global-settings-singleton'
      );
    });

    it('returns the stored settings with their dates decoded', async () => {
      soClient.get.mockResolvedValueOnce(
        aSavedObject({ sliRetention: { enabled: true, periodDays: 200, updatedAt: UPDATED_AT } })
      );

      await expect(repository.get()).resolves.toEqual({
        sliRetention: { enabled: true, periodDays: 200, updatedAt: new Date(UPDATED_AT) },
      });
    });

    it('returns a stored value outside the current input bounds', async () => {
      soClient.get.mockResolvedValueOnce(
        aSavedObject({ sliRetention: { enabled: true, periodDays: 30, updatedAt: UPDATED_AT } })
      );

      await expect(repository.get()).resolves.toEqual({
        sliRetention: { enabled: true, periodDays: 30, updatedAt: new Date(UPDATED_AT) },
      });
    });

    it('returns no settings and logs a warning when the stored settings are invalid', async () => {
      soClient.get.mockResolvedValueOnce(
        aSavedObject({ sliRetention: { enabled: true, periodDays: 0, updatedAt: UPDATED_AT } })
      );

      await expect(repository.get()).resolves.toEqual({});
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid stored global SLO settings')
      );
    });

    it('rethrows other errors', async () => {
      soClient.get.mockRejectedValueOnce(new Error('boom'));

      await expect(repository.get()).rejects.toThrow('boom');
    });
  });

  describe('save', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(UPDATED_AT));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('writes the given blocks stamped with the current date as a partial update with upsert', async () => {
      const expected = { sliRetention: { enabled: true, periodDays: 200, updatedAt: UPDATED_AT } };
      soClient.update.mockResolvedValueOnce(aSavedObject(expected));

      await expect(
        repository.save({ sliRetention: { enabled: true, periodDays: 200 } })
      ).resolves.toEqual({
        sliRetention: { enabled: true, periodDays: 200, updatedAt: new Date(UPDATED_AT) },
      });

      expect(soClient.update).toHaveBeenCalledWith(
        'slo-global-settings',
        'slo-global-settings-singleton',
        expected,
        { upsert: expected }
      );
    });
  });
});
