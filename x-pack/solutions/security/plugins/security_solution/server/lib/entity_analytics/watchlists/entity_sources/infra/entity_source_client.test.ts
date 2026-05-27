/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  MonitoringEntitySource,
  MonitoringEntitySourceAttributes,
} from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { WatchlistEntitySourceClient } from './entity_source_client';
import { watchlistEntitySourceTypeName } from './entity_source_type';

describe('WatchlistEntitySourceClient', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let client: WatchlistEntitySourceClient;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    client = new WatchlistEntitySourceClient({ soClient, namespace: 'default' });
  });

  describe('create', () => {
    it('delegates to soClient.create with correct type and attributes', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { type: 'index', name: 'Test', managed: false },
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'index',
        name: 'Test',
      };

      const result = await client.create(attrs);

      expect(soClient.create).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        { ...attrs, managed: false },
        { refresh: 'wait_for' }
      );
      expect(result.id).toBe('new-id');
    });

    it('throws when a source with the same name already exists', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [{ id: 'existing-id', attributes: { name: 'Duplicate' } }],
        total: 1,
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'index',
        name: 'Duplicate',
      };

      await expect(client.create(attrs)).rejects.toThrow(
        'A watchlist entity source with the name "Duplicate" already exists.'
      );
    });
  });

  describe('upsert', () => {
    it('creates a new source when no existing source is found', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { type: 'index', name: 'New Source', managed: false },
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'index',
        name: 'New Source',
      };

      const result = await client.upsert(attrs);

      expect(result.action).toBe('created');
      expect(soClient.create).toHaveBeenCalled();
    });

    it('updates an existing source when one is found by name', async () => {
      const existing = { id: 'source-id', attributes: { name: 'Existing' } };

      // First find call is from upsert's list(), second is from update's assertNameUniqueness
      soClient.find
        .mockResolvedValueOnce({ saved_objects: [existing], total: 1 } as never)
        .mockResolvedValueOnce({ saved_objects: [existing], total: 1 } as never);

      soClient.update.mockResolvedValue({
        id: 'source-id',
        attributes: { type: 'index', name: 'Existing' },
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'index',
        name: 'Existing',
      };

      const result = await client.upsert(attrs);

      expect(result.action).toBe('updated');
      expect(soClient.update).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        'source-id',
        expect.objectContaining({ name: 'Existing' }),
        { refresh: 'wait_for' }
      );
    });
  });

  describe('update', () => {
    it('delegates to soClient.update with correct params', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.update.mockResolvedValue({
        id: 'source-id',
        attributes: { name: 'Updated' },
      } as never);

      await client.update({ id: 'source-id', name: 'Updated' });

      expect(soClient.update).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        'source-id',
        { name: 'Updated' },
        { refresh: 'wait_for' }
      );
    });

    it('throws when renaming to a name that already exists', async () => {
      soClient.find.mockResolvedValue({
        saved_objects: [{ id: 'other-id', attributes: { name: 'Taken' } }],
        total: 1,
      } as never);

      await expect(client.update({ id: 'source-id', name: 'Taken' })).rejects.toThrow(
        'A watchlist entity source with the name "Taken" already exists.'
      );
    });
  });

  describe('get', () => {
    it('delegates to soClient.get and returns the source with id', async () => {
      soClient.get.mockResolvedValue({
        id: 'source-id',
        attributes: { name: 'My Source', type: 'index' },
      } as never);

      const result = await client.get('source-id');

      expect(soClient.get).toHaveBeenCalledWith(watchlistEntitySourceTypeName, 'source-id');
      expect(result).toEqual({ id: 'source-id', name: 'My Source', type: 'index' });
    });
  });

  describe('delete', () => {
    it('delegates to soClient.delete', async () => {
      await client.delete('source-id');

      expect(soClient.delete).toHaveBeenCalledWith(watchlistEntitySourceTypeName, 'source-id');
    });
  });

  describe('sync markers', () => {
    const source: MonitoringEntitySource = {
      id: 'source-id',
      type: 'entity_analytics_integration',
      name: 'Okta',
      indexPattern: 'logs-entityanalytics_okta.user-default',
      integrationName: 'entityanalytics_okta',
      enabled: true,
      integrations: {
        syncData: {
          lastUpdateProcessed: '2024-01-15T12:00:00Z',
          lastFullSync: '2024-01-10T00:00:00Z',
        },
      },
    };

    it('getLastProcessedMarker returns the stored marker', async () => {
      const result = await client.getLastProcessedMarker(source);
      expect(result).toBe('2024-01-15T12:00:00Z');
    });

    it('getLastProcessedMarker returns undefined when not set', async () => {
      const result = await client.getLastProcessedMarker({ ...source, integrations: undefined });
      expect(result).toBeUndefined();
    });

    it('getLastFullSyncMarker returns the stored marker', async () => {
      const result = await client.getLastFullSyncMarker(source);
      expect(result).toBe('2024-01-10T00:00:00Z');
    });

    it('updateLastProcessedMarker calls update with sync data', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.update.mockResolvedValue({ id: 'source-id', attributes: {} } as never);

      await client.updateLastProcessedMarker(source, '2024-02-01T00:00:00Z');

      expect(soClient.update).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        'source-id',
        expect.objectContaining({
          integrations: { syncData: { lastUpdateProcessed: '2024-02-01T00:00:00Z' } },
        }),
        { refresh: 'wait_for' }
      );
    });

    it('updateLastFullSyncMarker calls update with sync data', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.update.mockResolvedValue({ id: 'source-id', attributes: {} } as never);

      await client.updateLastFullSyncMarker(source, '2024-02-01T00:00:00Z');

      expect(soClient.update).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        'source-id',
        expect.objectContaining({
          integrations: { syncData: { lastFullSync: '2024-02-01T00:00:00Z' } },
        }),
        { refresh: 'wait_for' }
      );
    });
  });
});
