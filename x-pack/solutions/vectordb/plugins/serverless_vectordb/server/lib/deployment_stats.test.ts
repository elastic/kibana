/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { containsVectorField, fetchDashboardsCount, fetchIndexStats } from './deployment_stats';

describe('containsVectorField', () => {
  it('returns false for undefined properties', () => {
    expect(containsVectorField(undefined)).toBe(false);
  });

  it('returns false for an empty properties map', () => {
    expect(containsVectorField({})).toBe(false);
  });

  it('returns true when a top-level field is dense_vector', () => {
    expect(containsVectorField({ embedding: { type: 'dense_vector' } })).toBe(true);
  });

  it('returns true when a top-level field is semantic_text', () => {
    expect(containsVectorField({ body: { type: 'semantic_text' } })).toBe(true);
  });

  it('returns true when a top-level field is sparse_vector', () => {
    expect(containsVectorField({ ml_tokens: { type: 'sparse_vector' } })).toBe(true);
  });

  it('returns false when no vector fields are present', () => {
    expect(
      containsVectorField({
        title: { type: 'text' },
        count: { type: 'integer' },
      })
    ).toBe(false);
  });

  it('returns true when a vector field is nested inside an object', () => {
    expect(
      containsVectorField({
        metadata: {
          properties: {
            embedding: { type: 'dense_vector' },
          },
        },
      })
    ).toBe(true);
  });

  it('returns true when a vector field is deeply nested', () => {
    expect(
      containsVectorField({
        level1: {
          properties: {
            level2: {
              properties: {
                vector: { type: 'dense_vector' },
              },
            },
          },
        },
      })
    ).toBe(true);
  });

  it('returns false when nested properties contain no vector fields', () => {
    expect(
      containsVectorField({
        metadata: {
          properties: {
            author: { type: 'keyword' },
          },
        },
      })
    ).toBe(false);
  });

  it('returns true on first match and short-circuits', () => {
    expect(
      containsVectorField({
        title: { type: 'text' },
        embedding: { type: 'dense_vector' },
        body: { type: 'text' },
      })
    ).toBe(true);
  });
});

describe('fetchIndexStats', () => {
  let client: ScopedClusterClientMock;
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    client = elasticsearchServiceMock.createScopedClusterClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockMetering = (
    indices: Array<{ name: string; num_docs: number; size_in_bytes: number }>
  ) => {
    client.asSecondaryAuthUser.transport.request.mockResolvedValue({
      _total: {
        num_docs: indices.reduce((sum, i) => sum + i.num_docs, 0),
        size_in_bytes: indices.reduce((sum, i) => sum + i.size_in_bytes, 0),
      },
      indices,
    });
  };

  it('excludes dot-prefixed indices and aggregates count/size', async () => {
    mockMetering([
      { name: 'products', num_docs: 10, size_in_bytes: 100 },
      { name: '.kibana', num_docs: 999, size_in_bytes: 999 },
    ]);
    // No vector indices in the mappings.
    client.asCurrentUser.indices.getMapping.mockResolvedValue({
      products: { mappings: { properties: { title: { type: 'text' } } } },
    } as any);

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({ indicesCount: 1, storeSizeBytes: 100, vectorDocsCount: 0 });
    expect(client.asCurrentUser.esql.query).not.toHaveBeenCalled();
  });

  it('counts vector docs via ES|QL (avoiding nested-doc inflation from metering)', async () => {
    // metering over-reports num_docs (20) for the semantic_text index; ES|QL returns the real 10.
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    client.asCurrentUser.indices.getMapping.mockResolvedValue({
      vectordb: { mappings: { properties: { semantic_content: { type: 'semantic_text' } } } },
    } as any);
    client.asCurrentUser.esql.query.mockResolvedValue({
      columns: [{ name: 'count()', type: 'long' }],
      values: [[10]],
    } as any);

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM vectordb | STATS count()' })
    );
    expect(result.vectorDocsCount).toBe(10);
  });

  it('only queries the vector indices, not every user index', async () => {
    mockMetering([
      { name: 'vectordb', num_docs: 10, size_in_bytes: 500 },
      { name: 'plain-text', num_docs: 5, size_in_bytes: 50 },
    ]);
    client.asCurrentUser.indices.getMapping.mockResolvedValue({
      vectordb: { mappings: { properties: { embedding: { type: 'dense_vector' } } } },
      'plain-text': { mappings: { properties: { title: { type: 'text' } } } },
    } as any);
    client.asCurrentUser.esql.query.mockResolvedValue({
      columns: [{ name: 'count()', type: 'long' }],
      values: [[10]],
    } as any);

    await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM vectordb | STATS count()' })
    );
  });

  it('returns a null vectorDocsCount (not 0) when mapping/ES|QL lookup fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asCurrentUser.indices.getMapping.mockRejectedValue(new Error('boom'));

    const result = await fetchIndexStats(client, logger);

    // index/size counts are still valid; only the vector doc count is unavailable
    expect(result).toEqual({ indicesCount: 1, storeSizeBytes: 500, vectorDocsCount: null });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns all-null (not zeros) when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: null,
      storeSizeBytes: null,
      vectorDocsCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips mapping/ES|QL lookups when there are no user indices', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger);

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({ indicesCount: 0, storeSizeBytes: 0, vectorDocsCount: 0 });
    expect(client.asCurrentUser.indices.getMapping).not.toHaveBeenCalled();
  });
});

describe('fetchDashboardsCount', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the total from the saved objects client', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ total: 7, page: 1, per_page: 0, saved_objects: [] });

    await expect(fetchDashboardsCount(soClient, logger)).resolves.toBe(7);
    expect(soClient.find).toHaveBeenCalledWith({ type: 'dashboard', perPage: 0 });
  });

  it('returns null (not 0) and logs when the lookup fails', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockRejectedValue(new Error('nope'));

    await expect(fetchDashboardsCount(soClient, logger)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});
