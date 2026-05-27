/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE } from '../saved_objects/synthetics_settings_multi_space';
import {
  DEFAULT_MULTI_SPACE_SETTINGS,
  DefaultSyntheticsMultiSpaceSettingsRepository,
} from './synthetics_multi_space_settings_repository';

const FIND_OPTIONS = {
  type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
  perPage: 100,
  namespaces: [ALL_SPACES_ID],
};

const buildEmptyFindResponse = () => ({
  saved_objects: [],
  total: 0,
  per_page: 100,
  page: 1,
});

const buildFindResponseWith = (
  id: string,
  attributes: Record<string, unknown>,
  namespaces: string[] = ['default'],
  updatedAt?: string
) => ({
  saved_objects: [
    {
      id,
      type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
      attributes,
      namespaces,
      references: [],
      score: 0,
      ...(updatedAt ? { updated_at: updatedAt } : {}),
    },
  ],
  total: 1,
  per_page: 100,
  page: 1,
});

const buildMultiFindResponse = (
  objects: Array<{
    id: string;
    attributes: Record<string, unknown>;
    namespaces: string[];
    updatedAt: string;
  }>
) => ({
  saved_objects: objects.map(({ id, attributes, namespaces, updatedAt }) => ({
    id,
    type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
    attributes,
    namespaces,
    references: [],
    score: 0,
    updated_at: updatedAt,
  })),
  total: objects.length,
  per_page: 100,
  page: 1,
});

describe('DefaultSyntheticsMultiSpaceSettingsRepository', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let repository: DefaultSyntheticsMultiSpaceSettingsRepository;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    soClient.asScopedToNamespace.mockImplementation(() => soClient);
    repository = new DefaultSyntheticsMultiSpaceSettingsRepository(soClient);
  });

  describe('get', () => {
    it('searches saved objects across all spaces', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
      soClient.getCurrentNamespace.mockReturnValue('marketing');

      await repository.get();

      expect(soClient.find).toHaveBeenCalledWith(FIND_OPTIONS);
    });

    it('returns defaults with the current space when no document exists', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
      soClient.getCurrentNamespace.mockReturnValue('marketing');

      const result = await repository.get();

      expect(result).toEqual({ ...DEFAULT_MULTI_SPACE_SETTINGS, spaces: ['marketing'] });
    });

    it('falls back to the default space when getCurrentNamespace() is undefined', async () => {
      soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
      soClient.getCurrentNamespace.mockReturnValue(undefined);

      const result = await repository.get();

      expect(result.spaces).toEqual([DEFAULT_SPACE_ID]);
    });

    it('returns stored attributes and the saved objects namespaces when a document exists', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith(
          'settings-id',
          { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a', 'cluster-b'] },
          ['default', 'marketing']
        )
      );
      soClient.getCurrentNamespace.mockReturnValue('default');

      const result = await repository.get();

      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: ['cluster-a', 'cluster-b'],
        spaces: ['default', 'marketing'],
      });
    });

    it('applies defaults for any missing attributes', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith('settings-id', { useAllRemoteClusters: true })
      );
      soClient.getCurrentNamespace.mockReturnValue('default');

      const result = await repository.get();

      expect(result).toEqual({
        useAllRemoteClusters: true,
        selectedRemoteClusters: DEFAULT_MULTI_SPACE_SETTINGS.selectedRemoteClusters,
        spaces: ['default'],
      });
    });

    it('returns the wildcard-shared object when the current space matches no document directly', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith(
          'settings-id',
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          [ALL_SPACES_ID]
        )
      );
      soClient.getCurrentNamespace.mockReturnValue('marketing');

      const result = await repository.get();

      expect(result.spaces).toEqual([ALL_SPACES_ID]);
      expect(result.useAllRemoteClusters).toBe(true);
    });

    it('returns defaults in spaces where the document is not visible', async () => {
      soClient.find.mockResolvedValueOnce(
        buildFindResponseWith(
          'settings-id',
          { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] },
          ['default']
        )
      );
      soClient.getCurrentNamespace.mockReturnValue('marketing');

      const result = await repository.get();

      expect(result).toEqual({ ...DEFAULT_MULTI_SPACE_SETTINGS, spaces: ['marketing'] });
    });

    it('picks the most recently updated object when duplicates exist', async () => {
      soClient.find.mockResolvedValueOnce(
        buildMultiFindResponse([
          {
            id: 'older-id',
            attributes: { useAllRemoteClusters: true, selectedRemoteClusters: [] },
            namespaces: ['default'],
            updatedAt: '2026-05-18T21:35:43.524Z',
          },
          {
            id: 'newer-id',
            attributes: {
              useAllRemoteClusters: false,
              selectedRemoteClusters: ['remote_cluster'],
            },
            namespaces: ['default'],
            updatedAt: '2026-05-19T08:37:48.525Z',
          },
        ])
      );
      soClient.getCurrentNamespace.mockReturnValue('default');

      const result = await repository.get();

      expect(result.useAllRemoteClusters).toBe(false);
      expect(result.selectedRemoteClusters).toEqual(['remote_cluster']);
    });
  });

  describe('save', () => {
    describe('create', () => {
      it('anchors the document to the current space when no spaces are provided', async () => {
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
        expect(soClient.updateObjectsSpaces).not.toHaveBeenCalled();
        expect(result).toEqual({
          useAllRemoteClusters: true,
          selectedRemoteClusters: ['cluster-a'],
          spaces: ['marketing'],
        });
      });

      it('falls back to the default space when getCurrentNamespace() is undefined', async () => {
        soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
        soClient.getCurrentNamespace.mockReturnValue(undefined);
        soClient.create.mockResolvedValueOnce({} as any);

        const result = await repository.save({
          useAllRemoteClusters: false,
          selectedRemoteClusters: [],
        });

        expect(soClient.create).toHaveBeenCalledWith(
          SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
          { useAllRemoteClusters: false, selectedRemoteClusters: [] },
          { initialNamespaces: [DEFAULT_SPACE_ID] }
        );
        expect(result.spaces).toEqual([DEFAULT_SPACE_ID]);
      });

      it('uses the provided spaces as initialNamespaces', async () => {
        soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
        soClient.create.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] },
          ['default', 'marketing']
        );

        expect(soClient.create).toHaveBeenCalledWith(
          SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
          { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] },
          { initialNamespaces: ['default', 'marketing'] }
        );
        expect(result.spaces).toEqual(['default', 'marketing']);
      });

      it('supports the ALL_SPACES wildcard as initialNamespaces', async () => {
        soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
        soClient.create.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          [ALL_SPACES_ID]
        );

        expect(soClient.create).toHaveBeenCalledWith(
          SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
          expect.anything(),
          { initialNamespaces: [ALL_SPACES_ID] }
        );
        expect(result.spaces).toEqual([ALL_SPACES_ID]);
      });

      it('collapses the wildcard with specific spaces to a single ALL_SPACES entry', async () => {
        soClient.find.mockResolvedValueOnce(buildEmptyFindResponse());
        soClient.create.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          [ALL_SPACES_ID, 'default']
        );

        expect(soClient.create).toHaveBeenCalledWith(
          SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
          expect.anything(),
          { initialNamespaces: [ALL_SPACES_ID] }
        );
        expect(result.spaces).toEqual([ALL_SPACES_ID]);
      });
    });

    describe('update', () => {
      it('searches saved objects across all spaces', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['default']
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);

        await repository.save({
          useAllRemoteClusters: true,
          selectedRemoteClusters: [],
        });

        expect(soClient.find).toHaveBeenCalledWith(FIND_OPTIONS);
      });

      it('updates the singleton even when invoked from a space that does not see it', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['new_space']
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);
        soClient.getCurrentNamespace.mockReturnValue('default');

        const result = await repository.save({
          useAllRemoteClusters: true,
          selectedRemoteClusters: ['cluster-a'],
        });

        expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('new_space');
        expect(soClient.update).toHaveBeenCalledWith(
          SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
          'existing-id',
          { useAllRemoteClusters: true, selectedRemoteClusters: ['cluster-a'] }
        );
        expect(soClient.create).not.toHaveBeenCalled();
        expect(result.spaces).toEqual(['new_space']);
      });

      it('reconciles spaces through a scoped client when the SO is not visible in the current space', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['new_space']
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);
        soClient.updateObjectsSpaces.mockResolvedValueOnce({} as any);
        soClient.getCurrentNamespace.mockReturnValue('default');

        const result = await repository.save(
          { useAllRemoteClusters: false, selectedRemoteClusters: ['cluster-a'] },
          ['default']
        );

        expect(soClient.asScopedToNamespace).toHaveBeenCalledWith('new_space');
        expect(soClient.updateObjectsSpaces).toHaveBeenCalledWith(
          [{ id: 'existing-id', type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE }],
          ['default'],
          ['new_space']
        );
        expect(result.spaces).toEqual(['default']);
      });

      it('does not re-scope when the SO is visible via ALL_SPACES wildcard', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            [ALL_SPACES_ID]
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);
        soClient.getCurrentNamespace.mockReturnValue('marketing');

        await repository.save({
          useAllRemoteClusters: true,
          selectedRemoteClusters: [],
        });

        expect(soClient.asScopedToNamespace).not.toHaveBeenCalled();
      });

      it('updates attributes without touching spaces when none are provided', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['default', 'marketing']
          )
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
        expect(soClient.updateObjectsSpaces).not.toHaveBeenCalled();
        expect(soClient.create).not.toHaveBeenCalled();
        expect(result).toEqual({
          useAllRemoteClusters: true,
          selectedRemoteClusters: ['cluster-x'],
          spaces: ['default', 'marketing'],
        });
      });

      it('reconciles spaces via updateObjectsSpaces using a set diff', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['default', 'marketing']
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);
        soClient.updateObjectsSpaces.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          ['marketing', 'sales']
        );

        expect(soClient.updateObjectsSpaces).toHaveBeenCalledWith(
          [{ id: 'existing-id', type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE }],
          ['sales'],
          ['default']
        );
        expect(result.spaces).toEqual(['marketing', 'sales']);
      });

      it('handles the transition from specific spaces to ALL_SPACES wildcard', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['default']
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);
        soClient.updateObjectsSpaces.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          [ALL_SPACES_ID]
        );

        expect(soClient.updateObjectsSpaces).toHaveBeenCalledWith(
          [{ id: 'existing-id', type: SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE }],
          [ALL_SPACES_ID],
          ['default']
        );
        expect(result.spaces).toEqual([ALL_SPACES_ID]);
      });

      it('collapses [*, default] to [*] when the object already lives in ALL_SPACES', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            [ALL_SPACES_ID]
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          [ALL_SPACES_ID, 'default']
        );

        expect(soClient.updateObjectsSpaces).not.toHaveBeenCalled();
        expect(result.spaces).toEqual([ALL_SPACES_ID]);
      });

      it('skips updateObjectsSpaces when the requested spaces match the current ones', async () => {
        soClient.find.mockResolvedValueOnce(
          buildFindResponseWith(
            'existing-id',
            { useAllRemoteClusters: false, selectedRemoteClusters: [] },
            ['default', 'marketing']
          )
        );
        soClient.update.mockResolvedValueOnce({} as any);

        const result = await repository.save(
          { useAllRemoteClusters: true, selectedRemoteClusters: [] },
          ['default', 'marketing']
        );

        expect(soClient.updateObjectsSpaces).not.toHaveBeenCalled();
        expect(result.spaces).toEqual(['default', 'marketing']);
      });

      it('updates the most recently changed object when duplicates exist', async () => {
        soClient.find.mockResolvedValueOnce(
          buildMultiFindResponse([
            {
              id: 'older-id',
              attributes: { useAllRemoteClusters: false, selectedRemoteClusters: [] },
              namespaces: ['default'],
              updatedAt: '2026-05-18T21:35:43.524Z',
            },
            {
              id: 'newer-id',
              attributes: { useAllRemoteClusters: true, selectedRemoteClusters: [] },
              namespaces: [ALL_SPACES_ID],
              updatedAt: '2026-05-19T08:37:48.525Z',
            },
          ])
        );
        soClient.update.mockResolvedValueOnce({} as any);

        await repository.save({
          useAllRemoteClusters: false,
          selectedRemoteClusters: ['cluster-a'],
        });

        expect(soClient.update).toHaveBeenCalledWith(
          SYNTHETICS_SETTINGS_MULTI_SPACE_SO_TYPE,
          'newer-id',
          { useAllRemoteClusters: false, selectedRemoteClusters: ['cluster-a'] }
        );
        expect(soClient.create).not.toHaveBeenCalled();
      });
    });
  });
});
