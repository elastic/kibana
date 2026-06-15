/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import type {
  MonitoringEntitySource,
  MonitoringEntitySourceAttributes,
} from '../../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { WatchlistEntitySourceClient } from './entity_source_client';
import { watchlistEntitySourceTypeName } from './entity_source_type';

const mockValidateIndexPermissions = jest.fn();
const mockInvalidateEntitySourceApiKey = jest.fn();

jest.mock('../entity_source_api_key', () => ({
  validateIndexPermissions: (...args: unknown[]) => mockValidateIndexPermissions(...args),
  invalidateEntitySourceApiKey: (...args: unknown[]) => mockInvalidateEntitySourceApiKey(...args),
}));

describe('WatchlistEntitySourceClient', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockSecurity: {
    authc: {
      getCurrentUser: jest.Mock;
      apiKeys: {
        grantAsInternalUser: jest.Mock;
        cloneAsInternalUser: jest.Mock;
        invalidateAsInternalUser: jest.Mock;
      };
    };
  };
  let mockGetStartServices: jest.Mock;
  let client: WatchlistEntitySourceClient;

  const mockedApiKey = { id: 'new-kid', api_key: 'new-secret' };

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();

    mockSecurity = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({ authentication_type: 'token' }),
        apiKeys: {
          grantAsInternalUser: jest.fn().mockResolvedValue(mockedApiKey),
          cloneAsInternalUser: jest.fn(),
          invalidateAsInternalUser: jest.fn(),
        },
      },
    };
    mockGetStartServices = jest.fn().mockResolvedValue([{ security: mockSecurity }]);

    mockValidateIndexPermissions.mockReset().mockResolvedValue(undefined);
    mockInvalidateEntitySourceApiKey.mockReset().mockResolvedValue(undefined);

    // Default get mock: returns a non-index source without an API key
    soClient.get.mockResolvedValue({
      id: 'source-id',
      type: watchlistEntitySourceTypeName,
      references: [],
      attributes: { type: 'store', name: 'Test' },
    } as never);

    client = new WatchlistEntitySourceClient({
      soClient,
      namespace: 'default',
      esClient,
      getStartServices: mockGetStartServices as never,
      logger,
    });
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

    it('grants an API key when creating an index-type source with a request', async () => {
      const sourceAttributes = { type: 'index' as const, name: 'My Index Source' };
      const mockRequest = httpServerMock.createKibanaRequest();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { ...sourceAttributes, managed: false },
      } as never);

      await client.create(sourceAttributes, mockRequest);

      expect(mockSecurity.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();
      expect(soClient.create).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        expect.objectContaining({ apiKeyId: mockedApiKey.id, apiKey: mockedApiKey.api_key }),
        { refresh: 'wait_for' }
      );
    });

    it('does not grant an API key when creating a source with type other than index', async () => {
      const sourceAttributes = { type: 'store' as const, name: 'My Store Source' };
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { ...sourceAttributes, managed: false },
      } as never);

      await client.create(sourceAttributes);

      expect(mockSecurity.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
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

    it('strips apiKeyId and apiKey from the update payload', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.update.mockResolvedValue({
        id: 'source-id',
        attributes: { name: 'Updated' },
      } as never);

      await client.update({
        id: 'source-id',
        name: 'Updated',
        apiKeyId: 'should-be-stripped',
        apiKey: 'should-be-stripped',
      } as never);

      const [, , calledAttrs] = (soClient.update as jest.Mock).mock.calls[0];
      expect(calledAttrs).not.toHaveProperty('apiKeyId');
      expect(calledAttrs).not.toHaveProperty('apiKey');
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

    it('validates index permissions when the source type is index', async () => {
      const sourceAttributes = {
        type: 'index' as const,
        name: 'My Source',
        indexPattern: 'logs-*',
      };
      soClient.get.mockResolvedValue({
        id: 'source-id',
        type: watchlistEntitySourceTypeName,
        references: [],
        attributes: sourceAttributes,
      } as never);
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.update.mockResolvedValue({
        id: 'source-id',
        attributes: sourceAttributes,
      } as never);

      await client.update({ id: 'source-id', name: 'New name' });

      expect(mockValidateIndexPermissions).toHaveBeenCalledWith(esClient, 'logs-*');
    });

    describe('API key rotation on index pattern change', () => {
      it('invalidates old key and grants a new one when the index pattern changes', async () => {
        const sourceAttributes = {
          type: 'index' as const,
          name: 'My Source',
          indexPattern: 'old-*',
          apiKeyId: 'old-kid',
        };
        const newIndexPattern = 'new-*';
        const sourceId = 'source-id';
        const mockRequest = httpServerMock.createKibanaRequest();
        soClient.get.mockResolvedValue({
          id: sourceId,
          type: watchlistEntitySourceTypeName,
          references: [],
          attributes: sourceAttributes,
        } as never);
        soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
        soClient.update.mockResolvedValue({
          id: sourceId,
          attributes: {
            type: sourceAttributes.type,
            name: sourceAttributes.name,
            indexPattern: newIndexPattern,
          },
        } as never);

        await client.update({ id: sourceId, indexPattern: newIndexPattern }, mockRequest);

        expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(
          mockSecurity,
          sourceAttributes.apiKeyId,
          logger
        );
        expect(mockSecurity.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();
        const [, , savedAttrs] = (soClient.update as jest.Mock).mock.calls[0];
        expect(savedAttrs).toMatchObject({
          apiKeyId: mockedApiKey.id,
          apiKey: mockedApiKey.api_key,
        });
      });

      it('does not rotate key when the index pattern is unchanged', async () => {
        const sourceId = 'source-id';
        const newName = 'Renamed';
        soClient.get.mockResolvedValue({
          id: sourceId,
          type: watchlistEntitySourceTypeName,
          references: [],
          attributes: {
            type: 'index' as const,
            name: 'My Source',
            indexPattern: 'logs-*',
            apiKeyId: 'kid',
          },
        } as never);
        soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
        soClient.update.mockResolvedValue({
          id: sourceId,
          attributes: { type: 'index', name: newName },
        } as never);

        await client.update({ id: sourceId, name: newName });

        expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
        expect(mockSecurity.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
      });
    });

    describe('index → non-index transition', () => {
      it('invalidates old key and clears key fields', async () => {
        const sourceAttributes = {
          type: 'index' as const,
          name: 'My Source',
          indexPattern: 'logs-*',
          apiKeyId: 'old-kid',
        };
        const sourceId = 'source-id';
        soClient.get.mockResolvedValue({
          id: sourceId,
          type: watchlistEntitySourceTypeName,
          references: [],
          attributes: sourceAttributes,
        } as never);
        soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
        soClient.update.mockResolvedValue({
          id: sourceId,
          attributes: { type: 'store', name: 'My Source' },
        } as never);

        await client.update({ id: sourceId, type: 'store' });

        expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(
          mockSecurity,
          sourceAttributes.apiKeyId,
          logger
        );
        expect(mockSecurity.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
        const [, , savedAttrs] = (soClient.update as jest.Mock).mock.calls[0];
        expect(savedAttrs).toMatchObject({ apiKeyId: null, apiKey: null });
      });
    });

    describe('non-index → index transition', () => {
      it('grants a new key without invalidating a previous one', async () => {
        const sourceId = 'source-id';
        const indexPattern = 'logs-*';
        const mockRequest = httpServerMock.createKibanaRequest();
        // Default get mock already returns type: 'store'
        soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
        soClient.update.mockResolvedValue({
          id: sourceId,
          attributes: { type: 'index', name: 'Test', indexPattern },
        } as never);

        await client.update({ id: sourceId, type: 'index', indexPattern }, mockRequest);

        expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
        expect(mockSecurity.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();
        const [, , savedAttrs] = (soClient.update as jest.Mock).mock.calls[0];
        expect(savedAttrs).toMatchObject({
          apiKeyId: mockedApiKey.id,
          apiKey: mockedApiKey.api_key,
        });
      });
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
    it('delegates to soClient.delete and does not invalidate when there is no API key', async () => {
      await client.delete('source-id');

      expect(soClient.delete).toHaveBeenCalledWith(watchlistEntitySourceTypeName, 'source-id');
      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('invalidates the API key before deleting a source that has one', async () => {
      const sourceId = 'source-id';
      const apiKeyId = 'kid-1';
      soClient.get.mockResolvedValue({
        id: sourceId,
        type: watchlistEntitySourceTypeName,
        references: [],
        attributes: { type: 'index', name: 'My Source', apiKeyId },
      } as never);

      await client.delete(sourceId);

      expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(mockSecurity, apiKeyId, logger);
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
