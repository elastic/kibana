/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE } from '../saved_objects/synthetics_settings_multi_space';
import {
  DEFAULT_MULTI_SPACE_SETTINGS,
  DefaultSyntheticsMultiSpaceSettingsRepository,
} from './synthetics_multi_space_settings_repository';

const buildEmptyFindResponse = () => ({
  saved_objects: [],
  total: 0,
  per_page: 1,
  page: 1,
});

const buildFindResponseWith = (
  id: string,
  attributes: Record<string, unknown>,
  namespaces: string[] = ['default']
) => ({
  saved_objects: [
    {
      id,
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      attributes,
      namespaces,
      references: [],
      score: 0,
    },
  ],
  total: 1,
  per_page: 1,
  page: 1,
});

describe('DefaultSyntheticsMultiSpaceSettingsRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let repository: DefaultSyntheticsMultiSpaceSettingsRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    repository = new DefaultSyntheticsMultiSpaceSettingsRepository(soClient);
  });

  describe('get', () => {
    it('returns defaults when no settings document exists', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());

      const result = await repository.get();

      expect(result).toEqual(DEFAULT_MULTI_SPACE_SETTINGS);
      expect(soClient.find).toHaveBeenCalledWith({
        type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        perPage: 1,
      });
    });

    it('returns stored attributes when a settings document exists', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith('settings-id', {
          useAllRemoteClusters: true,
          selectedRemoteClusters: ['cluster-a', 'cluster-b'],
        })
      );

      const result = await repository.get();

      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a', 'cluster-b'],
      });
    });

    it('applies defaults for any missing attributes', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith('settings-id', { useAllRemoteClusters: true })
      );

      const result = await repository.get();

      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: DEFAULT_MULTI_SPACE_SETTINGS.selectedRemoteClusters,
      });
    });
  });

  describe('save', () => {
    it('creates the document with initialNamespaces from the current space on first save', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
      soClient.getCurrentNamespace.mockReturnValue('marketing');
      soClient.create.mockResolvedValueOnce({} as any);

      const result = await repository.save({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a'],
      });

      expect(soClient.create).toHaveBeenCalledWith(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] },
        { initialNamespaces: ['marketing'] }
      );
      expect(soClient.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a'],
      });
    });

    it('falls back to the default space when getCurrentNamespace() is undefined', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
      soClient.getCurrentNamespace.mockReturnValue(undefined);
      soClient.create.mockResolvedValueOnce({} as any);

      await repository.save({
        useAllRemoteClusters: false,
        selectedRemoteClusters: [],
      });

      expect(soClient.create).toHaveBeenCalledWith(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        { useAllRemoteClusters: false, selectedRemoteClusters: [] },
        { initialNamespaces: [DEFAULT_SPACE_ID] }
      );
    });

    it('updates the existing document by id on subsequent saves', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith('existing-id', {
          useAllRemoteClusters: false,
          selectedRemoteClusters: [],
        })
      );
      soClient.update.mockResolvedValueOnce({} as any);

      const result = await repository.save({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-x'],
      });

      expect(soClient.update).toHaveBeenCalledWith(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        'existing-id',
        { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-x'] }
      );
      expect(soClient.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-x'],
      });
    });

    it('applies defaults when saving a partial settings object', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
      soClient.getCurrentNamespace.mockReturnValue('default');
      soClient.create.mockResolvedValueOnce({} as any);

      const result = await repository.save({ useAllRemoteClusters: true });

      expect(soClient.create).toHaveBeenCalledWith(
        SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
        {
          useAllRemoteClusters: true,
          selectedRemoteClusters: DEFAULT_MULTI_SPACE_SETTINGS.selectedRemoteClusters,
        },
        { initialNamespaces: ['default'] }
      );
      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: DEFAULT_MULTI_SPACE_SETTINGS.selectedRemoteClusters,
      });
    });
  });
});
