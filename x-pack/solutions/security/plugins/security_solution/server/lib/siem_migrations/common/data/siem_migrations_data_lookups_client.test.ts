/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationsDataLookupsClient } from './siem_migrations_data_lookups_client';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { LOOKUPS_INDEX_PREFIX } from '../../../../../common/siem_migrations/constants';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { IScopedClusterClient } from '@kbn/core/server';

describe('SiemMigrationsDataLookupsClient', () => {
  const esClient =
    elasticsearchServiceMock.createScopedClusterClient() as unknown as IScopedClusterClient;

  const logger = loggingSystemMock.createLogger();
  const currentUser = {
    userName: 'testUser',
    profile_uid: 'testProfileUid',
  } as unknown as AuthenticatedUser;

  const spaceId = 'default';

  let client: SiemMigrationsDataLookupsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SiemMigrationsDataLookupsClient(currentUser, esClient, logger, spaceId);
  });

  describe('create', () => {
    it('should create index and index data for valid lookup name', async () => {
      esClient.asCurrentUser.indices.create = jest.fn().mockResolvedValue({});
      esClient.asCurrentUser.bulk = jest.fn().mockResolvedValue({});
      const data = [{ foo: 'bar' }];
      const indexName = `${LOOKUPS_INDEX_PREFIX}${spaceId}_mitre-event-names`;

      const result = await client.create('mitre-eventNames', data);

      expect(esClient.asCurrentUser.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ index: indexName })
      );
      expect(esClient.asCurrentUser.bulk).toHaveBeenCalled();
      expect(result).toBe(indexName);
    });

    it('should throw and log error for invalid lookup name', async () => {
      await expect(client.create('/', [])).rejects.toThrow(
        /does not conform to index naming rules/
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('does not conform to index naming rules')
      );
    });

    it('should not throw if index already exists', async () => {
      esClient.asCurrentUser.indices.create = jest.fn().mockRejectedValue({
        meta: { body: { error: { type: 'resource_already_exists_exception' } } },
      });
      esClient.asCurrentUser.bulk = jest.fn().mockResolvedValue({});
      await expect(client.create('test-lookup', [{ foo: 1 }])).resolves.toBeDefined();
    });

    it('should throw and logs error for other index creation errors', async () => {
      esClient.asCurrentUser.indices.create = jest.fn().mockRejectedValue(new Error('ES error'));
      await expect(client.create('test-lookup', [])).rejects.toThrow('ES error');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating lookup index')
      );
    });

    it('should throw and logs error for bulk indexing errors except 404', async () => {
      esClient.asCurrentUser.indices.create = jest.fn().mockResolvedValue({});
      esClient.asCurrentUser.bulk = jest
        .fn()
        .mockRejectedValue({ statusCode: 500, message: 'Bulk error' });
      await expect(client.create('test-lookup', [{ foo: 1 }])).rejects.toEqual(
        expect.objectContaining({ statusCode: 500 })
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error indexing data for lookup index')
      );
    });

    it('should ignore bulk indexing 404 errors', async () => {
      esClient.asCurrentUser.indices.create = jest.fn().mockResolvedValue({});
      esClient.asCurrentUser.bulk = jest.fn().mockRejectedValue({ statusCode: 404 });
      await expect(client.create('test-lookup', [{ foo: 1 }])).resolves.toBeDefined();
    });

    it('should skip bulk indexing if data is empty', async () => {
      esClient.asCurrentUser.indices.create = jest.fn().mockResolvedValue({});
      esClient.asCurrentUser.bulk = jest.fn();
      await client.create('test-lookup', []);
      expect(esClient.asCurrentUser.bulk).not.toHaveBeenCalled();
    });
  });

  describe('indexData', () => {
    it('should call bulk API with correct body', async () => {
      esClient.asCurrentUser.bulk = jest.fn().mockResolvedValue({});
      const indexName = 'test-index';
      const data = [{ a: 1 }, { b: 2 }];
      await client.indexData(indexName, data);
      expect(esClient.asCurrentUser.bulk).toHaveBeenCalledWith(
        expect.objectContaining({ index: indexName, body: expect.any(Array) })
      );
    });

    it('should throw and log error for bulk errors except 404', async () => {
      esClient.asCurrentUser.bulk = jest
        .fn()
        .mockRejectedValue({ statusCode: 500, message: 'Bulk error' });
      await expect(client.indexData('test-index', [{ foo: 1 }])).rejects.toEqual(
        expect.objectContaining({ statusCode: 500 })
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error indexing data for lookup index')
      );
    });

    it('should ignore 404 errors', async () => {
      esClient.asCurrentUser.bulk = jest.fn().mockRejectedValue({ statusCode: 404 });
      await expect(client.indexData('test-index', [{ foo: 1 }])).resolves.toBeUndefined();
    });
  });
});
