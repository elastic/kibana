/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { fetchAnonymizationFields } from '.';

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockEsClient = {
  search: jest.fn(),
} as unknown as ElasticsearchClient;

describe('fetchAnonymizationFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns anonymization fields from the space-specific index', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'field-1',
            _source: {
              '@timestamp': '2024-01-01T00:00:00.000Z',
              allowed: true,
              anonymized: false,
              created_at: '2024-01-01T00:00:00.000Z',
              created_by: 'test-user',
              field: 'host.name',
              namespace: 'default',
              updated_at: '2024-01-02T00:00:00.000Z',
              updated_by: 'test-user',
            },
          },
          {
            _id: 'field-2',
            _source: {
              '@timestamp': '2024-01-01T00:00:00.000Z',
              allowed: true,
              anonymized: true,
              created_at: '2024-01-01T00:00:00.000Z',
              created_by: 'test-user',
              field: 'user.name',
              namespace: 'default',
              updated_at: '2024-01-02T00:00:00.000Z',
              updated_by: 'test-user',
            },
          },
        ],
      },
    });

    const result = await fetchAnonymizationFields({
      esClient: mockEsClient,
      logger: mockLogger,
      spaceId: 'default',
    });

    expect(result).toEqual([
      {
        allowed: true,
        anonymized: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'test-user',
        field: 'host.name',
        id: 'field-1',
        namespace: 'default',
        timestamp: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        updatedBy: 'test-user',
      },
      {
        allowed: true,
        anonymized: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'test-user',
        field: 'user.name',
        id: 'field-2',
        namespace: 'default',
        timestamp: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        updatedBy: 'test-user',
      },
    ]);
  });

  it('queries the correct space-specific index', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'field-1',
            _source: {
              allowed: true,
              anonymized: false,
              field: '_id',
            },
          },
        ],
      },
    });

    await fetchAnonymizationFields({
      esClient: mockEsClient,
      logger: mockLogger,
      spaceId: 'my-space',
    });

    expect(mockEsClient.search).toHaveBeenCalledWith({
      index: '.kibana-elastic-ai-assistant-anonymization-fields-my-space',
      query: { match_all: {} },
      size: 1000,
    });
  });

  it('throws when the index does not exist', async () => {
    (mockEsClient.search as jest.Mock).mockRejectedValue(new Error('index_not_found_exception'));

    await expect(
      fetchAnonymizationFields({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: 'non-existent-space',
      })
    ).rejects.toThrow();
  });

  it('throws when there are no hits (empty index)', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    await expect(
      fetchAnonymizationFields({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: 'default',
      })
    ).rejects.toThrow();
  });

  it('includes the space ID in the error message when fields are not found', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    await expect(
      fetchAnonymizationFields({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: 'my-custom-space',
      })
    ).rejects.toThrow(/my-custom-space/);
  });

  it('throws with a user-actionable message when no fields are configured', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: { hits: [] },
    });

    await expect(
      fetchAnonymizationFields({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: 'default',
      })
    ).rejects.toThrow(/anonymization/i);
  });

  it('throws when all fields have allowed set to false', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'field-1',
            _source: {
              allowed: false,
              anonymized: false,
              field: 'host.name',
            },
          },
          {
            _id: 'field-2',
            _source: {
              allowed: false,
              anonymized: true,
              field: 'user.name',
            },
          },
        ],
      },
    });

    await expect(
      fetchAnonymizationFields({
        esClient: mockEsClient,
        logger: mockLogger,
        spaceId: 'default',
      })
    ).rejects.toThrow();
  });

  it('filters out hits without _source', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'field-1',
            _source: {
              allowed: true,
              anonymized: false,
              field: 'host.name',
            },
          },
          {
            _id: 'field-2',
            _source: undefined,
          },
        ],
      },
    });

    const result = await fetchAnonymizationFields({
      esClient: mockEsClient,
      logger: mockLogger,
      spaceId: 'default',
    });

    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('host.name');
  });

  it('uses a fallback id of empty string when _id is undefined', async () => {
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: undefined,
            _source: {
              allowed: true,
              anonymized: false,
              field: 'host.name',
            },
          },
        ],
      },
    });

    const result = await fetchAnonymizationFields({
      esClient: mockEsClient,
      logger: mockLogger,
      spaceId: 'default',
    });

    expect(result[0].id).toBe('');
  });
});
