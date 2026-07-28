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
import { fetchDashboardsCount, fetchIndexStats } from './deployment_stats';

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

  const mockFieldCaps = (fields: Record<string, Record<string, unknown>>) => {
    client.asCurrentUser.fieldCaps.mockResolvedValue({ indices: [], fields } as any);
  };

  /**
   * Derives the ES|QL count from the indices named in the `FROM` clause so that `vectorDocsCount`
   * assertions fail when the wrong indices are selected. A fixed count would pass no matter which
   * indices were queried, leaving misclassification detectable only via the query string.
   */
  const mockEsqlDocCounts = (docCountsByIndex: Record<string, number>) => {
    client.asCurrentUser.esql.query.mockImplementation((async (request: { query: string }) => {
      const [, fromClause] = /^FROM (.+) \| STATS/.exec(request.query) ?? [];
      if (!fromClause) throw new Error(`Unparseable ES|QL query: ${request.query}`);

      const totalDocCount = fromClause
        .split(',')
        .map((name) => name.replace(/^"|"$/g, ''))
        .reduce((sum, name) => {
          const indexDocCount = docCountsByIndex[name];
          if (indexDocCount === undefined) {
            throw new Error(`ES|QL queried an index that is not a vector index: ${name}`);
          }
          return sum + indexDocCount;
        }, 0);

      return { columns: [{ name: 'doc_count', type: 'long' }], values: [[totalDocCount]] };
    }) as any);
  };

  it('excludes dot-prefixed indices and aggregates count/size', async () => {
    mockMetering([
      { name: 'products', num_docs: 10, size_in_bytes: 100 },
      { name: '.kibana', num_docs: 999, size_in_bytes: 999 },
    ]);
    // No vector fields.
    mockFieldCaps({
      title: { text: { type: 'text', searchable: true, aggregatable: false, inference: false } },
    });

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({ indicesCount: 1, storeSizeBytes: 100, vectorDocsCount: 0 });
    expect(client.asCurrentUser.esql.query).not.toHaveBeenCalled();
  });

  it('restricts field caps to vector-relevant field types and skips metadata fields', async () => {
    mockMetering([{ name: 'products', num_docs: 10, size_in_bytes: 100 }]);
    mockFieldCaps({});

    await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledWith({
      index: ['products'],
      fields: '*',
      // `text` is included because `semantic_text` may be reported as `text` + `inference: true`
      types: ['dense_vector', 'sparse_vector', 'semantic_text', 'semantic', 'text'],
      filters: '-metadata',
      // Required so partially-mapped fields carry an explicit `indices` list.
      include_unmapped: true,
    });
  });

  it('detects semantic_text via the field caps inference flag and counts docs via ES|QL', async () => {
    // metering over-reports num_docs (20) for the semantic_text index; ES|QL returns the real 10.
    // `semantic_text` is reported as `text` by field caps, so it is detected via `inference: true`.
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockFieldCaps({
      semantic_content: {
        text: { type: 'text', searchable: true, aggregatable: false, inference: true },
      },
    });
    mockEsqlDocCounts({ vectordb: 10 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "vectordb" | STATS doc_count = COUNT(*)' })
    );
    expect(result.vectorDocsCount).toBe(10);
  });

  it('counts docs from every vector index when only one of them uses semantic_text', async () => {
    // Three indices holding 5 docs each. `content` is `semantic_text` in `semantic-index` and plain
    // `text` in the other two, so field caps merges all three into one `text` capability with
    // `inference: false` and no `indices` list. Reading only `inference` dropped `semantic-index`
    // and under-reported the 15 docs as 10.
    mockMetering([
      // metering num_docs is inflated for semantic_text indices by the nested chunk documents.
      { name: 'semantic-index', num_docs: 10, size_in_bytes: 500 },
      { name: 'dense-index', num_docs: 5, size_in_bytes: 500 },
      { name: 'byoe-index', num_docs: 5, size_in_bytes: 500 },
    ]);
    mockFieldCaps({
      content: {
        text: {
          type: 'text',
          searchable: true,
          aggregatable: false,
          inference: false,
          non_inference_indices: ['dense-index', 'byoe-index'],
        },
      },
      embedding: {
        unmapped: {
          type: 'unmapped',
          searchable: false,
          aggregatable: false,
          indices: ['semantic-index'],
        },
        dense_vector: {
          type: 'dense_vector',
          searchable: true,
          aggregatable: false,
          indices: ['dense-index', 'byoe-index'],
        },
      },
    });
    mockEsqlDocCounts({ 'semantic-index': 5, 'dense-index': 5, 'byoe-index': 5 });

    const result = await fetchIndexStats(client, logger);

    expect(result.vectorDocsCount).toBe(15);
  });

  it('detects semantic_text when the same field is plain text in other indices', async () => {
    // A field that is `semantic_text` in one index and `text` in others is merged by field caps into
    // a single `text` capability with `inference: false` and no `indices` list (the `text` type
    // family is uniform). Only `non_inference_indices` reveals which indices are not inference.
    mockMetering([
      { name: 'semantic-only', num_docs: 10, size_in_bytes: 500 },
      { name: 'plain-a', num_docs: 5, size_in_bytes: 50 },
      { name: 'plain-b', num_docs: 5, size_in_bytes: 50 },
    ]);
    mockFieldCaps({
      content: {
        text: {
          type: 'text',
          searchable: true,
          aggregatable: false,
          inference: false,
          non_inference_indices: ['plain-a', 'plain-b'],
        },
      },
    });
    mockEsqlDocCounts({ 'semantic-only': 5, 'plain-a': 5, 'plain-b': 5 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "semantic-only" | STATS doc_count = COUNT(*)' })
    );
    expect(result.vectorDocsCount).toBe(5);
  });

  it('excludes non-inference indices from a partially mapped mixed inference field', async () => {
    // When the field is absent from some indices the `text` capability carries both an explicit
    // `indices` list and `non_inference_indices`; the vector indices are the difference.
    mockMetering([
      { name: 'semantic-only', num_docs: 10, size_in_bytes: 500 },
      { name: 'plain-a', num_docs: 5, size_in_bytes: 50 },
      { name: 'no-content', num_docs: 5, size_in_bytes: 50 },
    ]);
    mockFieldCaps({
      content: {
        unmapped: {
          type: 'unmapped',
          searchable: false,
          aggregatable: false,
          inference: false,
          indices: ['no-content'],
        },
        text: {
          type: 'text',
          searchable: true,
          aggregatable: false,
          inference: false,
          indices: ['semantic-only', 'plain-a'],
          non_inference_indices: ['plain-a'],
        },
      },
    });
    mockEsqlDocCounts({ 'semantic-only': 5, 'plain-a': 5, 'no-content': 5 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "semantic-only" | STATS doc_count = COUNT(*)' })
    );
    expect(result.vectorDocsCount).toBe(5);
  });

  it('detects an inference field reported by its own `type` (no inference flag)', async () => {
    // In some versions/formats field caps reports `semantic_text` by its own type rather than as
    // `text` + `inference: true`, so the type set must also catch it.
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockFieldCaps({
      semantic_content: {
        semantic_text: { type: 'semantic_text', searchable: true, aggregatable: false },
      },
    });
    mockEsqlDocCounts({ vectordb: 10 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "vectordb" | STATS doc_count = COUNT(*)' })
    );
    expect(result.vectorDocsCount).toBe(10);
  });

  it('detects a `semantic` field by its own reported type', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    mockFieldCaps({
      body: {
        semantic: { type: 'semantic', searchable: true, aggregatable: false },
      },
    });
    mockEsqlDocCounts({ vectordb: 10 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "vectordb" | STATS doc_count = COUNT(*)' })
    );
    expect(result.vectorDocsCount).toBe(10);
  });

  it('only queries indices whose field caps report a vector field', async () => {
    mockMetering([
      { name: 'vectordb', num_docs: 10, size_in_bytes: 500 },
      { name: 'plain-text', num_docs: 5, size_in_bytes: 50 },
    ]);
    // `embedding` (dense_vector) only exists in `vectordb`, so field caps scopes it via `indices`.
    mockFieldCaps({
      embedding: {
        dense_vector: {
          type: 'dense_vector',
          searchable: true,
          aggregatable: false,
          inference: false,
          indices: ['vectordb'],
        },
      },
      title: { text: { type: 'text', searchable: true, aggregatable: false, inference: false } },
    });
    mockEsqlDocCounts({ vectordb: 10, 'plain-text': 5 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "vectordb" | STATS doc_count = COUNT(*)' })
    );
    // 10 rather than 15 proves `plain-text` docs are excluded.
    expect(result.vectorDocsCount).toBe(10);
  });

  it('does not classify indices where the vector field is unmapped', async () => {
    mockMetering([
      { name: 'test-vector', num_docs: 10, size_in_bytes: 500 },
      { name: 'test-plain', num_docs: 5000, size_in_bytes: 50 },
    ]);
    mockFieldCaps({
      embedding: {
        unmapped: {
          type: 'unmapped',
          searchable: false,
          aggregatable: false,
          inference: false,
          indices: ['test-plain'],
        },
        dense_vector: {
          type: 'dense_vector',
          searchable: true,
          aggregatable: false,
          inference: false,
          indices: ['test-vector'],
        },
      },
    });
    mockEsqlDocCounts({ 'test-vector': 10, 'test-plain': 5000 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM "test-vector" | STATS doc_count = COUNT(*)' })
    );
    expect(result.vectorDocsCount).toBe(10);
  });

  it('treats a vector field with no `indices` as present in every requested index', async () => {
    mockMetering([
      { name: 'vectordb-a', num_docs: 10, size_in_bytes: 500 },
      { name: 'vectordb-b', num_docs: 10, size_in_bytes: 500 },
    ]);
    // `indices` is omitted when the field is uniform across all requested indices.
    mockFieldCaps({
      embedding: {
        dense_vector: {
          type: 'dense_vector',
          searchable: true,
          aggregatable: false,
          inference: false,
        },
      },
    });
    mockEsqlDocCounts({ 'vectordb-a': 10, 'vectordb-b': 10 });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'FROM "vectordb-a","vectordb-b" | STATS doc_count = COUNT(*)',
      })
    );
    expect(result.vectorDocsCount).toBe(20);
  });

  it('batches the ES|QL count when there are more than 500 vector indices', async () => {
    const indices = Array.from({ length: 501 }, (_, i) => ({
      name: `vectordb-${i}`,
      num_docs: 1,
      size_in_bytes: 10,
    }));
    mockMetering(indices);
    // A uniform vector field means every index is a vector index.
    mockFieldCaps({
      embedding: {
        dense_vector: { type: 'dense_vector', searchable: true, aggregatable: false },
      },
    });
    mockEsqlDocCounts(Object.fromEntries(indices.map(({ name }) => [name, 1])));

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.esql.query).toHaveBeenCalledTimes(2);
    const queries = client.asCurrentUser.esql.query.mock.calls.map(
      ([request]) => (request as { query: string }).query
    );
    expect(queries[0]).toContain('"vectordb-0"');
    expect(queries[0]).toContain('"vectordb-499"');
    expect(queries[0]).not.toContain('"vectordb-500"');
    expect(queries[1]).toBe('FROM "vectordb-500" | STATS doc_count = COUNT(*)');
    expect(result.vectorDocsCount).toBe(501);
  });

  it('returns a null vectorDocsCount (not 0) when the vector lookup fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asCurrentUser.fieldCaps.mockRejectedValue(new Error('boom'));

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

  it('skips vector lookups when there are no user indices', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger);

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({ indicesCount: 0, storeSizeBytes: 0, vectorDocsCount: 0 });
    expect(client.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
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
