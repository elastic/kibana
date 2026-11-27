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
const mockGrantEntitySourceApiKey = jest.fn();

jest.mock('../entity_source_api_key', () => ({
  validateIndexPermissions: (...args: unknown[]) => mockValidateIndexPermissions(...args),
  invalidateEntitySourceApiKey: (...args: unknown[]) => mockInvalidateEntitySourceApiKey(...args),
  grantEntitySourceApiKey: (...args: unknown[]) => mockGrantEntitySourceApiKey(...args),
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

  const mockedApiKey = { apiKeyId: 'new-kid', apiKey: 'new-secret' };

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();

    mockSecurity = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue({ authentication_type: 'token' }),
        apiKeys: {
          grantAsInternalUser: jest.fn(),
          cloneAsInternalUser: jest.fn(),
          invalidateAsInternalUser: jest.fn(),
        },
      },
    };
    mockGetStartServices = jest.fn().mockResolvedValue([{ security: mockSecurity }]);

    mockValidateIndexPermissions.mockReset().mockResolvedValue(undefined);
    mockInvalidateEntitySourceApiKey.mockReset().mockResolvedValue(undefined);
    mockGrantEntitySourceApiKey.mockReset().mockResolvedValue(mockedApiKey);

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
      hasEncryptionKey: true,
    });
  });

  describe('create', () => {
    it('delegates to soClient.create with correct type and attributes', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { type: 'store', name: 'Test', managed: false },
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'store',
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

      expect(mockGrantEntitySourceApiKey).toHaveBeenCalled();
      expect(soClient.create).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        expect.objectContaining({ apiKeyId: mockedApiKey.apiKeyId, apiKey: mockedApiKey.apiKey }),
        { refresh: 'wait_for' }
      );
    });

    it('throws when creating an index-type source without a request', async () => {
      const sourceAttributes = { type: 'index' as const, name: 'My Index Source' };
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);

      await expect(client.create(sourceAttributes)).rejects.toThrow(
        'Cannot create index-type entity source without a request.'
      );

      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
      expect(soClient.create).not.toHaveBeenCalled();
    });

    it('does not grant an API key when creating a source with type other than index', async () => {
      const sourceAttributes = { type: 'store' as const, name: 'My Store Source' };
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { ...sourceAttributes, managed: false },
      } as never);

      await client.create(sourceAttributes);

      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('throws before granting an API key when hasEncryptionKey is false', async () => {
      const noEncryptClient = new WatchlistEntitySourceClient({
        soClient,
        namespace: 'default',
        esClient,
        getStartServices: mockGetStartServices as never,
        logger,
        hasEncryptionKey: false,
      });
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      const mockRequest = httpServerMock.createKibanaRequest();

      await expect(
        noEncryptClient.create({ type: 'index', name: 'My Index Source' }, mockRequest)
      ).rejects.toThrow('Index-type entity sources require encrypted saved objects');

      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('validates index permissions when creating an index-type source with an indexPattern', async () => {
      const sourceAttributes = {
        type: 'index' as const,
        name: 'My Index Source',
        indexPattern: 'logs-*',
      };
      const mockRequest = httpServerMock.createKibanaRequest();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { ...sourceAttributes, managed: false },
      } as never);

      await client.create(sourceAttributes, mockRequest);

      expect(mockValidateIndexPermissions).toHaveBeenCalledWith(esClient, 'logs-*');
    });

    it('does not validate index permissions when creating a non-index-type source', async () => {
      const sourceAttributes = { type: 'store' as const, name: 'My Store Source' };
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { ...sourceAttributes, managed: false },
      } as never);

      await client.create(sourceAttributes);

      expect(mockValidateIndexPermissions).not.toHaveBeenCalled();
    });

    it('does not call soClient.create when validateIndexPermissions throws', async () => {
      const sourceAttributes = {
        type: 'index' as const,
        name: 'My Index Source',
        indexPattern: 'logs-*',
      };
      const mockRequest = httpServerMock.createKibanaRequest();
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      mockValidateIndexPermissions.mockRejectedValue(new Error('Insufficient privileges'));

      await expect(client.create(sourceAttributes, mockRequest)).rejects.toThrow(
        'Insufficient privileges'
      );

      expect(soClient.create).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('creates a new source when no existing source is found', async () => {
      soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
      soClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { type: 'store', name: 'New Source', managed: false },
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'store',
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
        attributes: { type: 'store', name: 'Existing' },
      } as never);

      const attrs: MonitoringEntitySourceAttributes = {
        type: 'store',
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
        apiKeyId: 'existing-kid',
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
        expect(mockGrantEntitySourceApiKey).toHaveBeenCalled();
        const [, , savedAttrs] = (soClient.update as jest.Mock).mock.calls[0];
        expect(savedAttrs).toMatchObject({
          apiKeyId: mockedApiKey.apiKeyId,
          apiKey: mockedApiKey.apiKey,
        });
      });

      it('grants a new key when the API key was cleared (re-authorization)', async () => {
        const sourceId = 'source-id';
        const indexPattern = 'logs-*';
        const mockRequest = httpServerMock.createKibanaRequest();
        soClient.get.mockResolvedValue({
          id: sourceId,
          type: watchlistEntitySourceTypeName,
          references: [],
          attributes: {
            type: 'index' as const,
            name: 'My Source',
            indexPattern,
            apiKeyId: null,
            apiKey: null,
          },
        } as never);
        soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);
        soClient.update.mockResolvedValue({
          id: sourceId,
          attributes: { type: 'index', name: 'My Source', indexPattern },
        } as never);

        await client.update({ id: sourceId }, mockRequest);

        expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
        expect(mockGrantEntitySourceApiKey).toHaveBeenCalled();
        const [, , savedAttrs] = (soClient.update as jest.Mock).mock.calls[0];
        expect(savedAttrs).toMatchObject({
          apiKeyId: mockedApiKey.apiKeyId,
          apiKey: mockedApiKey.apiKey,
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
        expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
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
        expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
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
        expect(mockGrantEntitySourceApiKey).toHaveBeenCalled();
        const [, , savedAttrs] = (soClient.update as jest.Mock).mock.calls[0];
        expect(savedAttrs).toMatchObject({
          apiKeyId: mockedApiKey.apiKeyId,
          apiKey: mockedApiKey.apiKey,
        });
      });

      it('throws when no request is provided and an API key is needed', async () => {
        // Default get mock returns type: 'store', so transitioning to 'index' needs a new key
        soClient.find.mockResolvedValue({ saved_objects: [], total: 0 } as never);

        await expect(
          client.update({ id: 'source-id', type: 'index', indexPattern: 'logs-*' })
        ).rejects.toThrow('Cannot update index-type entity source without a request.');

        expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
        expect(soClient.update).not.toHaveBeenCalled();
      });

      it('throws before granting an API key when hasEncryptionKey is false', async () => {
        const noEncryptClient = new WatchlistEntitySourceClient({
          soClient,
          namespace: 'default',
          esClient,
          getStartServices: mockGetStartServices as never,
          logger,
          hasEncryptionKey: false,
        });
        const mockRequest = httpServerMock.createKibanaRequest();

        await expect(
          noEncryptClient.update(
            { id: 'source-id', type: 'index', indexPattern: 'logs-*' },
            mockRequest
          )
        ).rejects.toThrow('Index-type entity sources require encrypted saved objects');

        expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
      });
    });
  });

  describe('rotateApiKey', () => {
    const request = httpServerMock.createKibanaRequest();

    const mockSourcesById = (sources: Record<string, Record<string, unknown>>) => {
      soClient.get.mockImplementation(async (_type: string, id: string) => {
        const attributes = sources[id];
        if (!attributes) throw new Error(`Saved object [${id}] not found`);
        return { id, type: watchlistEntitySourceTypeName, references: [], attributes } as never;
      });
      soClient.update.mockImplementation(
        async (_type: string, id: string, attrs: Record<string, unknown>) =>
          ({ id, attributes: { ...sources[id], ...attrs } } as never)
      );
    };

    const indexSource = (overrides: Record<string, unknown> = {}) => ({
      type: 'index',
      name: 'My Source',
      indexPattern: 'logs-*',
      apiKeyId: 'old-kid',
      ...overrides,
    });

    it('replaces an existing key: persists the new key, then invalidates the old one', async () => {
      mockSourcesById({ 'source-1': indexSource() });

      const result = await client.rotateApiKey('source-1', request);

      expect(soClient.update).toHaveBeenCalledWith(
        watchlistEntitySourceTypeName,
        'source-1',
        mockedApiKey,
        expect.anything()
      );
      expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(
        mockSecurity,
        'old-kid',
        logger
      );
      // grant-first: the old key is only invalidated once the new one is saved
      expect(soClient.update.mock.invocationCallOrder[0]).toBeLessThan(
        mockInvalidateEntitySourceApiKey.mock.invocationCallOrder[0]
      );
      expect(result.apiKeyId).toBe(mockedApiKey.apiKeyId);
    });

    it('also grants a key to a source that has none', async () => {
      mockSourcesById({ 'source-1': indexSource({ apiKeyId: undefined }) });

      await client.rotateApiKey('source-1', request);

      expect(soClient.update).toHaveBeenCalled();
      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('keeps the old key untouched when the grant fails', async () => {
      mockSourcesById({ 'source-1': indexSource() });
      mockGrantEntitySourceApiKey.mockRejectedValue(new Error('grant failed'));

      await expect(client.rotateApiKey('source-1', request)).rejects.toThrow('grant failed');

      expect(soClient.update).not.toHaveBeenCalled();
      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('discards the new key and keeps the old one when saving the source fails', async () => {
      mockSourcesById({ 'source-1': indexSource() });
      soClient.update.mockRejectedValue(new Error('conflict'));

      await expect(client.rotateApiKey('source-1', request)).rejects.toThrow('conflict');

      expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledTimes(1);
      expect(mockInvalidateEntitySourceApiKey).toHaveBeenCalledWith(
        mockSecurity,
        mockedApiKey.apiKeyId,
        logger
      );
    });

    it('keeps the new key when the save fails after the write was applied', async () => {
      mockSourcesById({ 'source-1': indexSource() });
      soClient.update.mockImplementation(async () => {
        // the write is committed but the response never arrives
        soClient.get.mockResolvedValue({
          id: 'source-1',
          type: watchlistEntitySourceTypeName,
          references: [],
          attributes: indexSource({ apiKeyId: mockedApiKey.apiKeyId }),
        } as never);
        throw new Error('connection lost');
      });

      await expect(client.rotateApiKey('source-1', request)).rejects.toThrow('connection lost');

      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('does not invalidate the new key when it cannot confirm what was saved', async () => {
      mockSourcesById({ 'source-1': indexSource() });
      soClient.update.mockImplementation(async () => {
        soClient.get.mockRejectedValue(new Error('unavailable'));
        throw new Error('connection lost');
      });

      await expect(client.rotateApiKey('source-1', request)).rejects.toThrow('connection lost');

      expect(mockInvalidateEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('rejects a caller who cannot read the index, without granting anything', async () => {
      mockSourcesById({ 'source-1': indexSource() });
      mockValidateIndexPermissions.mockRejectedValue(new Error('Insufficient privileges'));

      await expect(client.rotateApiKey('source-1', request)).rejects.toThrow(
        'Insufficient privileges'
      );

      expect(mockValidateIndexPermissions).toHaveBeenCalledWith(esClient, 'logs-*');
      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('rejects sources that are not index-type', async () => {
      mockSourcesById({ 'source-1': { type: 'store', name: 'Store' } });

      await expect(client.rotateApiKey('source-1', request)).rejects.toThrow(/index-type/);
      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
    });

    it('throws when encrypted saved objects are not available', async () => {
      mockSourcesById({ 'source-1': indexSource() });
      const noEncryptionClient = new WatchlistEntitySourceClient({
        soClient,
        namespace: 'default',
        esClient,
        getStartServices: mockGetStartServices as never,
        logger,
        hasEncryptionKey: false,
      });

      await expect(noEncryptionClient.rotateApiKey('source-1', request)).rejects.toThrow(
        /encrypted saved objects/
      );
      expect(mockGrantEntitySourceApiKey).not.toHaveBeenCalled();
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

  describe('list by ids', () => {
    it('returns no sources when the id list is empty', async () => {
      const result = await client.list({}, []);

      expect(soClient.bulkGet).not.toHaveBeenCalled();
      expect(soClient.find).not.toHaveBeenCalled();
      expect(result).toEqual({ sources: [], page: 1, per_page: 10, total: 0 });
    });

    it('loads the requested saved objects directly and skips missing ones', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'src-1',
            type: watchlistEntitySourceTypeName,
            references: [],
            attributes: { type: 'store', name: 'Entity Store' },
          },
          {
            id: 'missing',
            type: watchlistEntitySourceTypeName,
            error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
          },
        ],
      } as never);

      const result = await client.list({}, ['src-1', 'missing']);

      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { type: watchlistEntitySourceTypeName, id: 'src-1' },
        { type: watchlistEntitySourceTypeName, id: 'missing' },
      ]);
      expect(soClient.find).not.toHaveBeenCalled();
      expect(result.sources).toEqual([{ id: 'src-1', type: 'store', name: 'Entity Store' }]);
      expect(result.total).toBe(1);
    });

    it('sorts the matched sources by sort_field/sort_order before paginating', async () => {
      soClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'src-b',
            type: watchlistEntitySourceTypeName,
            references: [],
            attributes: { type: 'store', name: 'Bravo' },
          },
          {
            id: 'src-a',
            type: watchlistEntitySourceTypeName,
            references: [],
            attributes: { type: 'store', name: 'Alpha' },
          },
          {
            id: 'src-c',
            type: watchlistEntitySourceTypeName,
            references: [],
            attributes: { type: 'store', name: 'Charlie' },
          },
        ],
      } as never);

      const result = await client.list({ sort_field: 'name', sort_order: 'asc' }, [
        'src-b',
        'src-a',
        'src-c',
      ]);

      expect(result.sources.map((source) => source.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);

      const descResult = await client.list({ sort_field: 'name', sort_order: 'desc' }, [
        'src-b',
        'src-a',
        'src-c',
      ]);

      expect(descResult.sources.map((source) => source.name)).toEqual([
        'Charlie',
        'Bravo',
        'Alpha',
      ]);
    });

    it('defaults to 10 per page', async () => {
      const twelveSources = Array.from({ length: 12 }, (_, i) => ({
        id: `src-${i}`,
        type: watchlistEntitySourceTypeName,
        references: [],
        attributes: { type: 'store' as const, name: `Source ${i}` },
      }));
      soClient.bulkGet.mockResolvedValue({ saved_objects: twelveSources } as never);

      const result = await client.list(
        {},
        twelveSources.map((s) => s.id)
      );

      expect(result.per_page).toBe(10);
      expect(result.sources).toHaveLength(10);
      expect(result.total).toBe(12);

      const secondPage = await client.list(
        { page: 2 },
        twelveSources.map((s) => s.id)
      );
      expect(secondPage.sources).toHaveLength(2);
    });
  });
});
