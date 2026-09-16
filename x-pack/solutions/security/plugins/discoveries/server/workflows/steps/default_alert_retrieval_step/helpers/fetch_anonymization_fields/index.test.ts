/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { fetchAnonymizationFields } from '.';

const mockEsClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;

describe('fetchAnonymizationFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the index contains fields', () => {
    it('returns mapped anonymization fields', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'field-1',
              _source: {
                '@timestamp': '2024-01-01T00:00:00Z',
                allowed: true,
                anonymized: false,
                created_at: '2024-01-01',
                created_by: 'elastic',
                field: 'host.name',
                namespace: 'default',
                updated_at: '2024-01-02',
                updated_by: 'elastic',
              },
            },
          ],
        },
      });

      const result = await fetchAnonymizationFields({ esClient: mockEsClient, spaceId: 'default' });

      expect(result).toEqual([
        {
          allowed: true,
          anonymized: false,
          createdAt: '2024-01-01',
          createdBy: 'elastic',
          field: 'host.name',
          id: 'field-1',
          namespace: 'default',
          timestamp: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02',
          updatedBy: 'elastic',
        },
      ]);
    });

    it('queries the correct space-scoped index', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });

      await fetchAnonymizationFields({ esClient: mockEsClient, spaceId: 'my-space' });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-elastic-ai-assistant-anonymization-fields-my-space',
        })
      );
    });

    it('filters out hits without _source', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            { _id: 'no-source', _source: undefined },
            {
              _id: 'with-source',
              _source: { allowed: true, anonymized: false, field: 'user.name' },
            },
          ],
        },
      });

      const result = await fetchAnonymizationFields({ esClient: mockEsClient, spaceId: 'default' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('with-source');
    });

    it('uses empty string for id when _id is undefined', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: undefined,
              _source: { allowed: true, anonymized: false, field: 'host.ip' },
            },
          ],
        },
      });

      const result = await fetchAnonymizationFields({ esClient: mockEsClient, spaceId: 'default' });

      expect(result[0].id).toBe('');
    });
  });

  describe('when the index does not exist or query fails', () => {
    it('returns an empty array on error', async () => {
      (mockEsClient.search as jest.Mock).mockRejectedValue(new Error('index_not_found_exception'));

      const result = await fetchAnonymizationFields({ esClient: mockEsClient, spaceId: 'default' });

      expect(result).toEqual([]);
    });

    it('returns an empty array when hits are empty', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue({ hits: { hits: [] } });

      const result = await fetchAnonymizationFields({ esClient: mockEsClient, spaceId: 'default' });

      expect(result).toEqual([]);
    });
  });
});
