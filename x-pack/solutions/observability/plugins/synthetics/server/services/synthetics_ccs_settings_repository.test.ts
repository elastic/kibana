/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SyntheticsCCSSettings } from '../../common/runtime_types';
import {
  DefaultSyntheticsCCSSettingsRepository,
  DEFAULT_CCS_SETTINGS,
} from './synthetics_ccs_settings_repository';
import {
  SO_SYNTHETICS_CCS_SETTINGS_TYPE,
  syntheticsCCSSettingsObjectId,
} from '../saved_objects/synthetics_ccs_settings';

describe('DefaultSyntheticsCCSSettingsRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let repository: DefaultSyntheticsCCSSettingsRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    soClient.getCurrentNamespace.mockReturnValue('default');
    repository = new DefaultSyntheticsCCSSettingsRepository(soClient);
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns stored settings when found', async () => {
      const stored: SyntheticsCCSSettings = {
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster1'],
        remoteKibanaUrls: { cluster1: 'https://cluster1.example.com' },
      };

      soClient.get.mockResolvedValue({
        id: syntheticsCCSSettingsObjectId('default'),
        type: SO_SYNTHETICS_CCS_SETTINGS_TYPE,
        attributes: stored,
        references: [],
      });

      const result = await repository.get();

      expect(result).toStrictEqual(stored);
      expect(soClient.get).toHaveBeenCalledWith(
        SO_SYNTHETICS_CCS_SETTINGS_TYPE,
        syntheticsCCSSettingsObjectId('default')
      );
    });

    it('returns default settings when not found', async () => {
      soClient.get.mockRejectedValue(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          SO_SYNTHETICS_CCS_SETTINGS_TYPE,
          syntheticsCCSSettingsObjectId('default')
        )
      );

      const result = await repository.get();

      expect(result).toStrictEqual(DEFAULT_CCS_SETTINGS);
    });

    it('throws on unexpected errors', async () => {
      soClient.get.mockRejectedValue(new Error('unexpected error'));

      await expect(repository.get()).rejects.toThrow('unexpected error');
    });
  });

  describe('save', () => {
    it('creates the settings with correct id and overwrite', async () => {
      const settings: SyntheticsCCSSettings = {
        useAllRemoteClusters: false,
        selectedRemoteClusters: ['cluster1', 'cluster2'],
        remoteKibanaUrls: {
          cluster1: 'https://cluster1.example.com',
          cluster2: 'https://cluster2.example.com',
        },
      };

      soClient.create.mockResolvedValue({
        id: syntheticsCCSSettingsObjectId('default'),
        type: SO_SYNTHETICS_CCS_SETTINGS_TYPE,
        attributes: settings,
        references: [],
      });

      const result = await repository.save(settings);

      expect(result).toStrictEqual(settings);
      expect(soClient.create).toHaveBeenCalledWith(SO_SYNTHETICS_CCS_SETTINGS_TYPE, settings, {
        id: syntheticsCCSSettingsObjectId('default'),
        overwrite: true,
      });
    });
  });
});
