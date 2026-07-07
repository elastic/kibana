/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createLeadIndexService } from './lead_index_service';
import { getLeadsIndexName } from '../../../../../common/entity_analytics/lead_generation';

const mockCreateOrUpdateIndex = jest.fn();
jest.mock('../../utils/create_or_update_index', () => ({
  createOrUpdateIndex: (...args: unknown[]) => mockCreateOrUpdateIndex(...args),
}));

describe('LeadIndexService', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const spaceId = 'default';

  const adhocIndex = getLeadsIndexName(spaceId, 'adhoc');
  const scheduledIndex = getLeadsIndexName(spaceId, 'scheduled');

  let service: ReturnType<typeof createLeadIndexService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createLeadIndexService({ esClient, logger, spaceId });
  });

  describe('createIndices', () => {
    it('creates both indices with correct mappings and settings', async () => {
      mockCreateOrUpdateIndex.mockResolvedValue(undefined);

      await service.createIndices();

      expect(mockCreateOrUpdateIndex).toHaveBeenCalledTimes(2);

      const indexNames = mockCreateOrUpdateIndex.mock.calls.map(
        ([{ options }]: [{ options: { index: string } }]) => options.index
      );
      expect(indexNames).toContain(adhocIndex);
      expect(indexNames).toContain(scheduledIndex);

      const [{ options }] = mockCreateOrUpdateIndex.mock.calls[0];
      expect(options.settings).toEqual({ hidden: true });
      expect(options.mappings.properties).toHaveProperty('id');
      expect(options.mappings.properties).toHaveProperty('observations');
    });
  });

  describe('doesIndexExist', () => {
    it('returns true when the index exists', async () => {
      esClient.indices.exists.mockResolvedValueOnce(true);
      expect(await service.doesIndexExist('adhoc')).toBe(true);
    });

    it('returns false when the index does not exist', async () => {
      esClient.indices.exists.mockResolvedValueOnce(false);
      expect(await service.doesIndexExist('adhoc')).toBe(false);
    });

    it('returns false on Elasticsearch error', async () => {
      esClient.indices.exists.mockRejectedValueOnce(new Error('connection failed'));
      expect(await service.doesIndexExist('adhoc')).toBe(false);
    });
  });

  describe('deleteIndices', () => {
    it('deletes both indices when they exist', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.delete.mockResolvedValue({ acknowledged: true });

      await service.deleteIndices();

      expect(esClient.indices.delete).toHaveBeenCalledTimes(2);
    });

    it('skips deletion for non-existent indices', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      await service.deleteIndices();
      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('logs an error when deletion fails', async () => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.delete.mockRejectedValue(new Error('deletion denied'));

      await service.deleteIndices();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete lead index')
      );
    });
  });
});
