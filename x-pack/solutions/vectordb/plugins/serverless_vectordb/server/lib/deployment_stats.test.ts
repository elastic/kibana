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
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
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
   * Derives each `exists` aggregation's `doc_count` from the searched indices and field so that
   * `vectorsCount` assertions fail when the wrong indices or fields are counted. Fixed counts would
   * pass no matter what was requested, leaving misclassification detectable only via the request.
   */
  const mockVectorFieldDocCounts = (docCountsByIndex: Record<string, Record<string, number>>) => {
    client.asCurrentUser.search.mockImplementation((async (request: SearchRequest) => {
      const indices = request.index as string[];

      const aggregations = Object.entries(request.aggs ?? {}).map(([aggName, aggregation]) => {
        const { field } = (aggregation as { filter: { exists: { field: string } } }).filter.exists;

        const docCount = indices.reduce((sum, indexName) => {
          const docCountsByField = docCountsByIndex[indexName];
          if (docCountsByField === undefined) {
            throw new Error(`Searched an index that is not a vector index: ${indexName}`);
          }
          return sum + (docCountsByField[field] ?? 0);
        }, 0);

        return [aggName, { doc_count: docCount }];
      });

      return { aggregations: Object.fromEntries(aggregations) };
    }) as any);
  };

  /** The indices and vector fields each search counted, in call order. */
  const searchedIndicesAndFields = () =>
    client.asCurrentUser.search.mock.calls.map(([request]) => {
      const { index, aggs } = request as SearchRequest;
      return {
        indices: index as string[],
        fields: Object.values(aggs ?? {}).map(
          (aggregation) =>
            (aggregation as { filter: { exists: { field: string } } }).filter.exists.field
        ),
      };
    });

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

    expect(result).toEqual({ indicesCount: 1, storeSizeBytes: 100, vectorsCount: 0 });
    expect(client.asCurrentUser.search).not.toHaveBeenCalled();
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

  it('counts documents holding a value for the field with an exists aggregation', async () => {
    // metering over-reports num_docs (20) for the semantic_text index because it counts the nested
    // chunk documents; aggregations only see the 10 top-level documents.
    // `semantic_text` is reported as `text` by field caps, so it is detected via `inference: true`.
    mockMetering([{ name: 'vectordb', num_docs: 20, size_in_bytes: 500 }]);
    mockFieldCaps({
      semantic_content: {
        text: { type: 'text', searchable: true, aggregatable: false, inference: true },
      },
    });
    mockVectorFieldDocCounts({ vectordb: { semantic_content: 10 } });

    const result = await fetchIndexStats(client, logger);

    expect(client.asCurrentUser.search).toHaveBeenCalledWith({
      index: ['vectordb'],
      size: 0,
      track_total_hits: false,
      ignore_unavailable: true,
      aggs: { vector_field_0: { filter: { exists: { field: 'semantic_content' } } } },
    });
    expect(result.vectorsCount).toBe(10);
  });

  it('counts each populated vector field of a document separately', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    mockFieldCaps({
      embedding: {
        dense_vector: { type: 'dense_vector', searchable: true, aggregatable: false },
      },
      content: {
        text: { type: 'text', searchable: true, aggregatable: false, inference: true },
      },
    });
    // All 10 documents carry an embedding; 7 of them also carry semantic content.
    mockVectorFieldDocCounts({ vectordb: { embedding: 10, content: 7 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['vectordb'], fields: ['content', 'embedding'] },
    ]);
    // 17 rather than 10 proves the second field of each document is counted too.
    expect(result.vectorsCount).toBe(17);
  });

  it('ignores the internal chunk subfields a semantic_text field indexes its embeddings in', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 30, size_in_bytes: 500 }]);
    mockFieldCaps({
      content: {
        text: { type: 'text', searchable: true, aggregatable: false, inference: true },
      },
      'content.inference.chunks.embeddings': {
        sparse_vector: { type: 'sparse_vector', searchable: true, aggregatable: false },
      },
    });
    mockVectorFieldDocCounts({ vectordb: { content: 10 } });

    const result = await fetchIndexStats(client, logger);

    // Counting the chunk subfield as well would report the same 10 values twice.
    expect(searchedIndicesAndFields()).toEqual([{ indices: ['vectordb'], fields: ['content'] }]);
    expect(result.vectorsCount).toBe(10);
  });

  it('counts every vector index when only one of them uses semantic_text', async () => {
    // Three indices holding 5 documents each. `content` is `semantic_text` in `semantic-index` and
    // plain `text` in the other two, so field caps merges all three into one `text` capability with
    // `inference: false` and no `indices` list. Reading only `inference` dropped `semantic-index`
    // and under-reported the 15 vectors as 10.
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
    mockVectorFieldDocCounts({
      'semantic-index': { content: 5 },
      'dense-index': { embedding: 5 },
      'byoe-index': { embedding: 5 },
    });

    const result = await fetchIndexStats(client, logger);

    // The two indices mapping the same vector field are counted in a single search.
    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['semantic-index'], fields: ['content'] },
      { indices: ['dense-index', 'byoe-index'], fields: ['embedding'] },
    ]);
    expect(result.vectorsCount).toBe(15);
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
    mockVectorFieldDocCounts({ 'semantic-only': { content: 5 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['semantic-only'], fields: ['content'] },
    ]);
    expect(result.vectorsCount).toBe(5);
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
    mockVectorFieldDocCounts({ 'semantic-only': { content: 5 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['semantic-only'], fields: ['content'] },
    ]);
    expect(result.vectorsCount).toBe(5);
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
    mockVectorFieldDocCounts({ vectordb: { semantic_content: 10 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['vectordb'], fields: ['semantic_content'] },
    ]);
    expect(result.vectorsCount).toBe(10);
  });

  it('detects a `semantic` field by its own reported type', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    mockFieldCaps({
      body: {
        semantic: { type: 'semantic', searchable: true, aggregatable: false },
      },
    });
    mockVectorFieldDocCounts({ vectordb: { body: 10 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([{ indices: ['vectordb'], fields: ['body'] }]);
    expect(result.vectorsCount).toBe(10);
  });

  it('only searches indices whose field caps report a vector field', async () => {
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
    mockVectorFieldDocCounts({ vectordb: { embedding: 10 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([{ indices: ['vectordb'], fields: ['embedding'] }]);
    expect(result.vectorsCount).toBe(10);
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
    mockVectorFieldDocCounts({ 'test-vector': { embedding: 10 } });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['test-vector'], fields: ['embedding'] },
    ]);
    expect(result.vectorsCount).toBe(10);
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
    mockVectorFieldDocCounts({
      'vectordb-a': { embedding: 10 },
      'vectordb-b': { embedding: 10 },
    });

    const result = await fetchIndexStats(client, logger);

    expect(searchedIndicesAndFields()).toEqual([
      { indices: ['vectordb-a', 'vectordb-b'], fields: ['embedding'] },
    ]);
    expect(result.vectorsCount).toBe(20);
  });

  it('batches the search when there are more than 500 vector indices', async () => {
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
    mockVectorFieldDocCounts(
      Object.fromEntries(indices.map(({ name }) => [name, { embedding: 1 }]))
    );

    const result = await fetchIndexStats(client, logger);

    const [firstSearch, secondSearch] = searchedIndicesAndFields();
    expect(client.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(firstSearch.indices).toHaveLength(500);
    expect(firstSearch.indices[0]).toBe('vectordb-0');
    expect(firstSearch.indices[499]).toBe('vectordb-499');
    expect(secondSearch.indices).toEqual(['vectordb-500']);
    expect(result.vectorsCount).toBe(501);
  });

  it('returns a null vectorsCount (not 0) when the vector lookup fails', async () => {
    mockMetering([{ name: 'vectordb', num_docs: 10, size_in_bytes: 500 }]);
    client.asCurrentUser.fieldCaps.mockRejectedValue(new Error('boom'));

    const result = await fetchIndexStats(client, logger);

    // index/size counts are still valid; only the vector count is unavailable
    expect(result).toEqual({ indicesCount: 1, storeSizeBytes: 500, vectorsCount: null });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('returns all-null (not zeros) when the metering call fails', async () => {
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('metering down'));

    const result = await fetchIndexStats(client, logger);

    expect(result).toEqual({
      indicesCount: null,
      storeSizeBytes: null,
      vectorsCount: null,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips vector lookups when there are no user indices', async () => {
    mockMetering([]);

    const result = await fetchIndexStats(client, logger);

    // a genuinely empty deployment reports real zeros, not null
    expect(result).toEqual({ indicesCount: 0, storeSizeBytes: 0, vectorsCount: 0 });
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
