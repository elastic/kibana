/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { EntityStorePreferencesClient } from '.';
import { EntityStorePreferencesTypeName } from './types';

const namespace = 'default';

const createMockSoClient = () =>
  ({
    find: jest.fn(),
    create: jest.fn().mockResolvedValue({ attributes: {} }),
    update: jest.fn().mockResolvedValue({ attributes: {} }),
  } as unknown as jest.Mocked<SavedObjectsClientContract>);

const emptyFind = { total: 0, saved_objects: [], page: 1, per_page: 1 };

describe('EntityStorePreferencesClient', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let client: EntityStorePreferencesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    soClient = createMockSoClient();
    client = new EntityStorePreferencesClient(soClient, namespace, loggerMock.create());
  });

  describe('get', () => {
    it('returns the defaults when no saved object exists', async () => {
      soClient.find.mockResolvedValue(emptyFind as never);

      await expect(client.get()).resolves.toEqual({ autoInstall: true });
    });

    it('returns the persisted preferences as-is', async () => {
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ attributes: { autoInstall: false } }],
        page: 1,
        per_page: 1,
      } as never);

      await expect(client.get()).resolves.toEqual({ autoInstall: false });
    });
  });

  describe('update', () => {
    it('creates the saved object (defaults applied) with a deterministic id when none exists', async () => {
      soClient.find.mockResolvedValue(emptyFind as never);

      await client.update({ autoInstall: false });

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStorePreferencesTypeName,
        { autoInstall: false },
        { id: `${EntityStorePreferencesTypeName}-${namespace}`, refresh: 'wait_for' }
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('updates the existing saved object when one exists', async () => {
      soClient.find.mockResolvedValue({
        total: 1,
        saved_objects: [{ id: `${EntityStorePreferencesTypeName}-${namespace}`, attributes: {} }],
        page: 1,
        per_page: 1,
      } as never);

      await client.update({ autoInstall: true });

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStorePreferencesTypeName,
        `${EntityStorePreferencesTypeName}-${namespace}`,
        { autoInstall: true },
        { refresh: 'wait_for', mergeAttributes: true }
      );
      expect(soClient.create).not.toHaveBeenCalled();
    });
  });
});
