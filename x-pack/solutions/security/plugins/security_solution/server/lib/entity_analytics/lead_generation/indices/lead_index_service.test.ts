/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createLeadIndexService } from './lead_index_service';
import {
  getLeadsIndexName,
  getLegacyLeadsIndexNames,
} from '../../../../../common/entity_analytics/lead_generation';

const mockCreateOrUpdateIndex = jest.fn();
jest.mock('../../utils/create_or_update_index', () => ({
  createOrUpdateIndex: (...args: unknown[]) => mockCreateOrUpdateIndex(...args),
}));

describe('LeadIndexService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const spaceId = 'default';

  const indexName = getLeadsIndexName(spaceId);
  const legacyIndexNames = getLegacyLeadsIndexNames(spaceId);

  let service: ReturnType<typeof createLeadIndexService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createLeadIndexService({ esClient, logger, spaceId });
  });

  describe('createIndex', () => {
    it('creates the index with correct mappings and settings', async () => {
      mockCreateOrUpdateIndex.mockResolvedValue(undefined);

      await service.createIndex();

      expect(mockCreateOrUpdateIndex).toHaveBeenCalledTimes(1);

      const [{ options }] = mockCreateOrUpdateIndex.mock.calls[0];
      expect(options.index).toBe(indexName);
      expect(options.settings).toEqual({ auto_expand_replicas: '0-1', hidden: true });
      expect(options.mappings.properties).toHaveProperty('id');
      expect(options.mappings.properties).toHaveProperty('observations');
    });
  });

  describe('doesIndexExist', () => {
    it('returns true when the index exists', async () => {
      esClient.indices.exists.mockResolvedValueOnce(true);
      expect(await service.doesIndexExist()).toBe(true);
    });

    it('returns false when the index does not exist', async () => {
      esClient.indices.exists.mockResolvedValueOnce(false);
      expect(await service.doesIndexExist()).toBe(false);
    });

    it('returns false on Elasticsearch error', async () => {
      esClient.indices.exists.mockRejectedValueOnce(new Error('connection failed'));
      expect(await service.doesIndexExist()).toBe(false);
    });
  });

  describe('deleteIndex', () => {
    it('deletes the index when it exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.delete.mockResolvedValue({ acknowledged: true });

      await service.deleteIndex();

      expect(esClient.indices.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: indexName })
      );
    });

    it('deletes legacy adhoc and scheduled indices when they exist', async () => {
      esClient.indices.exists.mockImplementation(async ({ index }) =>
        [...legacyIndexNames, indexName].includes(index as string)
      );
      esClient.indices.delete.mockResolvedValue({ acknowledged: true });

      await service.deleteIndex();

      expect(esClient.indices.delete).toHaveBeenCalledTimes(legacyIndexNames.length + 1);
      for (const name of legacyIndexNames) {
        expect(esClient.indices.delete).toHaveBeenCalledWith(
          expect.objectContaining({ index: name })
        );
      }
      expect(esClient.indices.delete).toHaveBeenCalledWith(
        expect.objectContaining({ index: indexName })
      );
    });

    it('skips deletion when the index does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      await service.deleteIndex();
      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('logs an error when deletion fails', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.delete.mockRejectedValue(new Error('deletion denied'));

      await service.deleteIndex();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete lead index')
      );
    });
  });
});
