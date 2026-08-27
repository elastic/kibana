/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { SecuritySolutionRequestHandlerContextMock } from '../../__mocks__/request_context';
import { requestContextMock } from '../../__mocks__';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../../common/workflows/triggers';
import {
  collectChangedIdsByFamily,
  collectStatusTransitions,
  extractWorkflowStatus,
  fetchAlertIdToIndex,
  fetchAlertIdIndexWithSource,
  prefetchAllPreviousStatusesByIds,
  prefetchPreviousStatusesByIds,
  prefetchPreviousStatusesByQuery,
  verifyAlertIdsInIndex,
  type FoundHit,
} from './prefetch_previous_statuses';

// `esClient.search` is typed to resolve a complete SearchResponse, but these tests only
// exercise the `hits` handling. Wrap the partial body in the mandatory response envelope
// so the mocks stay focused on what is under test.
const searchResponse = (body: { hits: unknown }): estypes.SearchResponse =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    ...body,
  } as estypes.SearchResponse);

const makeSearchResponse = (
  hits: Array<{ _id: string; status: string; _index?: string }>,
  total: number,
  relation: 'eq' | 'gte' = 'eq'
): estypes.SearchResponse =>
  searchResponse({
    hits: {
      total: { value: total, relation },
      hits: hits.map(({ _id, status, _index = 'test-index' }) => ({
        _id,
        _index,
        _source: { [ALERT_WORKFLOW_STATUS]: status },
      })),
    },
  });

describe('extractWorkflowStatus', () => {
  it('returns undefined for null source', () => {
    expect(extractWorkflowStatus(null)).toBeUndefined();
  });

  it('returns undefined for undefined source', () => {
    expect(extractWorkflowStatus(undefined)).toBeUndefined();
  });

  it('returns undefined when the status field is missing', () => {
    expect(extractWorkflowStatus({ other: 'field' })).toBeUndefined();
  });

  it('returns undefined when the status field is not a string', () => {
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 42 })).toBeUndefined();
  });

  it('returns undefined when the status is a string not in the enum', () => {
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'triaged' })).toBeUndefined();
  });

  it('returns undefined for an unrecognized modern status even when a valid signal.status is present', () => {
    // The update script treats a non-null modern field as authoritative; signal.status must not
    // be used as a fallback here or the no-op check would suppress events for changing docs.
    expect(
      extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'triaged', signal: { status: 'closed' } })
    ).toBeUndefined();
  });

  it('returns the status when it is a valid WorkflowStatus value', () => {
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'acknowledged' })).toBe('acknowledged');
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'open' })).toBe('open');
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'in-progress' })).toBe('in-progress');
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'closed' })).toBe('closed');
  });
});

describe('prefetchPreviousStatusesByIds', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    esClient.search.mockResolvedValue(makeSearchResponse([], 0));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns empty previousStatuses and empty idToIndex when no hits are returned', async () => {
    const { previousStatuses, idToIndex } = await prefetchPreviousStatusesByIds(
      esClient,
      'index',
      []
    );
    expect(previousStatuses).toEqual([]);
    expect(idToIndex.size).toBe(0);
  });

  it('returns previous statuses and idToIndex for found docs', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse(
        [
          { _id: 'id1', status: 'acknowledged', _index: '.alerts-security.alerts-default' },
          { _id: 'id2', status: 'closed', _index: '.alerts-security.alerts-default' },
        ],
        2
      )
    );

    const { previousStatuses, idToIndex } = await prefetchPreviousStatusesByIds(esClient, 'index', [
      'id1',
      'id2',
    ]);

    expect(previousStatuses).toEqual([
      { id: 'id1', previousStatus: 'acknowledged' },
      { id: 'id2', previousStatus: 'closed' },
    ]);
    expect(idToIndex).toEqual(
      new Map([
        ['id1', '.alerts-security.alerts-default'],
        ['id2', '.alerts-security.alerts-default'],
      ])
    );
  });

  it('omits id from idToIndex when hit._index is absent, but still includes it in previousStatuses', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'id1', _source: { [ALERT_WORKFLOW_STATUS]: 'open' } }],
        },
      })
    );

    const { previousStatuses, idToIndex } = await prefetchPreviousStatusesByIds(esClient, 'index', [
      'id1',
    ]);

    expect(previousStatuses).toEqual([{ id: 'id1', previousStatus: 'open' }]);
    expect(idToIndex.size).toBe(0);
  });

  it('only processes docs returned as search hits (not-found docs are simply absent)', async () => {
    esClient.search.mockResolvedValue(makeSearchResponse([{ _id: 'id1', status: 'open' }], 1));

    const { previousStatuses } = await prefetchPreviousStatusesByIds(esClient, 'index', [
      'id1',
      'id2',
    ]);

    expect(previousStatuses).toEqual([{ id: 'id1', previousStatus: 'open' }]);
  });

  it('omits the previousStatus entry when source status is not a valid WorkflowStatus', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'id1', _index: 'test-index', _source: { [ALERT_WORKFLOW_STATUS]: null } }],
        },
      })
    );

    const { previousStatuses } = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);

    expect(previousStatuses).toEqual([]);
  });

  it('sets hasStatusField=true for a doc with a recognized modern status', async () => {
    esClient.search.mockResolvedValue(makeSearchResponse([{ _id: 'id1', status: 'open' }], 1));
    const { hits } = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);
    expect(hits[0].hasStatusField).toBe(true);
  });

  it('sets hasStatusField=true for a doc with an unrecognized non-null modern status', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            { _id: 'id1', _index: 'test-index', _source: { [ALERT_WORKFLOW_STATUS]: 'triaged' } },
          ],
        },
      })
    );
    const { hits } = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);
    expect(hits[0].hasStatusField).toBe(true);
    expect(hits[0].previousStatus).toBeUndefined();
  });

  it('sets hasStatusField=false for a doc with no status fields', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'id1', _index: 'test-index', _source: {} }],
        },
      })
    );
    const { hits } = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);
    expect(hits[0].hasStatusField).toBe(false);
  });

  it('sets hasStatusField=false when the modern field is null', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'id1', _index: 'test-index', _source: { [ALERT_WORKFLOW_STATUS]: null } }],
        },
      })
    );
    const { hits } = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);
    expect(hits[0].hasStatusField).toBe(false);
  });

  it('calls search with a string index as-is and an ids query', async () => {
    await prefetchPreviousStatusesByIds(esClient, 'my-index', ['id1']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'my-index',
        query: { ids: { values: ['id1'] } },
      })
    );
  });

  it('joins an array index with commas before calling search', async () => {
    await prefetchPreviousStatusesByIds(esClient, ['index-a', 'index-b'], ['id1']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'index-a,index-b' })
    );
  });

  it('passes ignore_unavailable: true to search', async () => {
    await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ ignore_unavailable: true })
    );
  });

  it('includes ALERT_WORKFLOW_STATUS and signal.status in _source_includes', async () => {
    await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ _source_includes: [ALERT_WORKFLOW_STATUS, 'signal.status'] })
    );
  });

  it('propagates search errors to the caller', async () => {
    esClient.search.mockRejectedValue(new Error('ES error'));

    await expect(prefetchPreviousStatusesByIds(esClient, 'index', ['id1'])).rejects.toThrow(
      'ES error'
    );
  });

  it('caps search size at MAX_ALERTS_PER_TRIGGER when ids.length exceeds the limit', async () => {
    const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 1 }, (_, i) => `id-${i}`);
    await prefetchPreviousStatusesByIds(esClient, 'index', oversizedIds);

    const call = esClient.search.mock.calls[0][0] as { size?: number };
    expect(call.size).toBeLessThanOrEqual(MAX_ALERTS_PER_TRIGGER);
  });
});

describe('prefetchPreviousStatusesByQuery', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    esClient.search.mockResolvedValue(makeSearchResponse([], 0));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns empty result when there are no hits', async () => {
    const { ids, previousStatuses, idToIndex, truncated } = await prefetchPreviousStatusesByQuery(
      esClient,
      'index',
      { match_all: {} }
    );

    expect(ids).toEqual([]);
    expect(previousStatuses).toEqual([]);
    expect(idToIndex.size).toBe(0);
    expect(truncated).toBe(false);
  });

  it('returns ids, previousStatuses, and idToIndex for each hit', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse(
        [
          { _id: 'id1', status: 'closed', _index: '.alerts-security.alerts-default' },
          { _id: 'id2', status: 'open', _index: '.alerts-security.alerts-default' },
        ],
        2
      )
    );

    const { ids, previousStatuses, idToIndex } = await prefetchPreviousStatusesByQuery(
      esClient,
      'index',
      { match_all: {} }
    );

    expect(ids).toEqual(['id1', 'id2']);
    expect(previousStatuses).toEqual([
      { id: 'id1', previousStatus: 'closed' },
      { id: 'id2', previousStatus: 'open' },
    ]);
    expect(idToIndex).toEqual(
      new Map([
        ['id1', '.alerts-security.alerts-default'],
        ['id2', '.alerts-security.alerts-default'],
      ])
    );
  });

  it('omits id from idToIndex when hit._index is absent, but still includes it in previousStatuses', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'id1', _source: { [ALERT_WORKFLOW_STATUS]: 'open' } }],
        },
      })
    );

    const { previousStatuses, idToIndex } = await prefetchPreviousStatusesByQuery(
      esClient,
      'index',
      { match_all: {} }
    );

    expect(previousStatuses).toEqual([{ id: 'id1', previousStatus: 'open' }]);
    expect(idToIndex.size).toBe(0);
  });

  it('sets truncated to true when total exceeds MAX_ALERTS_PER_TRIGGER (eq relation)', async () => {
    esClient.search.mockResolvedValue(makeSearchResponse([], MAX_ALERTS_PER_TRIGGER + 1));

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(true);
  });

  it('sets truncated to true when ES returns gte relation at the track_total_hits boundary', async () => {
    // Real ES returns relation:'gte' when total > track_total_hits (MAX_ALERTS_PER_TRIGGER + 1).
    // value equals exactly MAX_ALERTS_PER_TRIGGER + 1 in that case.
    esClient.search.mockResolvedValue(makeSearchResponse([], MAX_ALERTS_PER_TRIGGER + 1, 'gte'));

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(true);
  });

  it('does not set truncated when total equals MAX_ALERTS_PER_TRIGGER exactly', async () => {
    esClient.search.mockResolvedValue(makeSearchResponse([], MAX_ALERTS_PER_TRIGGER));

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(false);
  });

  it('handles numeric total hits format', async () => {
    esClient.search.mockResolvedValue(
      searchResponse({
        hits: { total: MAX_ALERTS_PER_TRIGGER + 1, hits: [] },
      })
    );

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(true);
  });

  it('wraps the query in bool.filter when calling search', async () => {
    const query = { term: { status: 'open' } };

    await prefetchPreviousStatusesByQuery(esClient, 'index', query);

    const call = (esClient.search as unknown as jest.Mock).mock.calls[0][0];
    expect(call.query.bool.filter).toEqual(query);
  });

  it('uses MAX_ALERTS_PER_TRIGGER as the search size and sets track_total_hits to detect truncation', async () => {
    await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        size: MAX_ALERTS_PER_TRIGGER,
        track_total_hits: MAX_ALERTS_PER_TRIGGER + 1,
      })
    );
  });

  it('passes ignore_unavailable: true to search', async () => {
    await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ ignore_unavailable: true })
    );
  });

  it('joins an array index with commas before calling search', async () => {
    await prefetchPreviousStatusesByQuery(esClient, ['index-a', 'index-b'], { match_all: {} });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'index-a,index-b' })
    );
  });

  it('propagates search errors to the caller', async () => {
    esClient.search.mockRejectedValue(new Error('ES error'));

    await expect(
      prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} })
    ).rejects.toThrow('ES error');
  });

  it('includes runtime_mappings in the search request when provided', async () => {
    const runtimeMappings = {
      my_field: {
        type: 'keyword' as const,
        script: { source: 'emit(doc["_source.my_field"].value)' },
      },
    };

    await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} }, runtimeMappings);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ runtime_mappings: runtimeMappings })
    );
  });

  it('omits runtime_mappings from the search request when not provided', async () => {
    await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    const call = (esClient.search as unknown as jest.Mock).mock.calls[0][0];
    expect(call).not.toHaveProperty('runtime_mappings');
  });

  it('omits runtime_mappings from the search request when provided as an empty object', async () => {
    await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} }, {});

    const call = (esClient.search as unknown as jest.Mock).mock.calls[0][0];
    expect(call).not.toHaveProperty('runtime_mappings');
  });

  // Status-less documents are never mutated by the update script. They must be excluded at
  // the ES level, not just post-filtered, because `truncated` is derived from hits.total —
  // counting them would report truncation for a request that changes nothing.
  const STATUS_FIELD_REQUIRED = {
    bool: {
      must_not: [
        { exists: { field: ALERT_WORKFLOW_STATUS } },
        { exists: { field: 'signal.status' } },
      ],
    },
  };

  it('always excludes documents with neither a modern nor a legacy status field', async () => {
    const query = { term: { 'some.field': 'value' } };

    await prefetchPreviousStatusesByQuery(esClient, 'index', query);

    const call = (esClient.search as unknown as jest.Mock).mock.calls[0][0];
    expect(call.query.bool.must_not).toEqual([STATUS_FIELD_REQUIRED]);
  });

  it('does not report truncation when every match over the cap is status-less', async () => {
    // ES applies the must_not, so a query matching more than MAX_ALERTS_PER_TRIGGER
    // status-less documents comes back empty and total 0 — not truncated.
    esClient.search.mockResolvedValue(
      searchResponse({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } })
    );

    const result = await prefetchPreviousStatusesByQuery(
      esClient,
      'index',
      { match_all: {} },
      undefined,
      'closed'
    );

    expect(result.truncated).toBe(false);
    expect(result.ids).toEqual([]);
  });

  it('adds must_not for modern field AND legacy-only docs when excludeStatus is provided', async () => {
    const query = { term: { 'some.field': 'value' } };

    await prefetchPreviousStatusesByQuery(esClient, 'index', query, undefined, 'closed');

    const call = (esClient.search as unknown as jest.Mock).mock.calls[0][0];
    expect(call.query.bool.must_not).toEqual([
      STATUS_FIELD_REQUIRED,
      { term: { [ALERT_WORKFLOW_STATUS]: 'closed' } },
      {
        bool: {
          must: [{ term: { 'signal.status': 'closed' } }],
          must_not: [{ exists: { field: ALERT_WORKFLOW_STATUS } }],
        },
      },
    ]);
  });
});

describe('fetchAlertIdToIndex', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];

  const makeIdToIndexResponse = (hits: Array<{ _id: string; _index: string }>) =>
    searchResponse({
      hits: {
        total: { value: hits.length, relation: 'eq' },
        hits: hits.map((h) => ({ _id: h._id, _index: h._index })),
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    esClient.search.mockResolvedValue(makeIdToIndexResponse([]));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns an empty array when no hits are returned', async () => {
    const result = await fetchAlertIdToIndex(esClient, 'index', []);
    expect(result).toHaveLength(0);
  });

  it('returns one IdIndexPair per hit, preserving both id and index', async () => {
    const response = makeIdToIndexResponse([
      { _id: 'id-1', _index: '.alerts-security.alerts-default' },
      { _id: 'id-2', _index: '.internal.alerts-security.alerts-default-000001' },
    ]);
    esClient.search.mockResolvedValue(response);
    const result = await fetchAlertIdToIndex(esClient, 'index', ['id-1', 'id-2']);
    expect(result.find((p) => p.id === 'id-1')?.index).toBe('.alerts-security.alerts-default');
    expect(result.find((p) => p.id === 'id-2')?.index).toBe(
      '.internal.alerts-security.alerts-default-000001'
    );
  });

  it('returns two pairs for the same _id found in two different indices', async () => {
    const response = makeIdToIndexResponse([
      { _id: 'shared', _index: '.alerts-security.alerts-default' },
      { _id: 'shared', _index: '.alerts-security.attack.discovery.alerts-default' },
    ]);
    esClient.search.mockResolvedValue(response);
    const result = await fetchAlertIdToIndex(esClient, 'index', ['shared']);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.index)).toEqual(
      expect.arrayContaining([
        '.alerts-security.alerts-default',
        '.alerts-security.attack.discovery.alerts-default',
      ])
    );
  });

  it('calls search with _source: false and ignore_unavailable: true', async () => {
    await fetchAlertIdToIndex(esClient, 'my-index', ['id-1']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ _source: false, ignore_unavailable: true })
    );
  });

  it('passes a terms._id query for the provided ids', async () => {
    await fetchAlertIdToIndex(esClient, 'my-index', ['a', 'b']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: { terms: { _id: ['a', 'b'] } } })
    );
  });

  it('caps query ids and size to MAX_ALERTS_PER_TRIGGER and preserves input order', async () => {
    const oversizedIds = Array.from({ length: MAX_ALERTS_PER_TRIGGER + 5 }, (_, i) => `id-${i}`);
    await fetchAlertIdToIndex(esClient, 'my-index', oversizedIds);

    const call = esClient.search.mock.calls[0][0] as {
      query: { terms: { _id: string[] } };
      size: number;
    };
    const queriedIds = call.query.terms._id;
    expect(queriedIds).toHaveLength(MAX_ALERTS_PER_TRIGGER);
    expect(call.size).toBe(MAX_ALERTS_PER_TRIGGER);
    // first MAX_ALERTS_PER_TRIGGER input IDs in original order — not the tail
    expect(queriedIds).toEqual(oversizedIds.slice(0, MAX_ALERTS_PER_TRIGGER));
  });

  it('joins an array index with commas before calling search', async () => {
    await fetchAlertIdToIndex(esClient, ['idx-a', 'idx-b'], ['id-1']);
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ index: 'idx-a,idx-b' }));
  });
});

describe('verifyAlertIdsInIndex', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];

  const makeIdResponse = (
    hits: Array<{ _id: string; _index: string }>
  ): estypes.SearchResponse<unknown> => ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: hits.length, relation: 'eq' },
      max_score: 0,
      hits: hits.map((h) => ({ _id: h._id, _index: h._index, _score: 0 })),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    esClient.search.mockResolvedValue(makeIdResponse([]));
  });

  it('returns unique verified IDs for found docs', async () => {
    esClient.search.mockResolvedValueOnce(
      makeIdResponse([
        { _id: 'a', _index: '.alerts-security.alerts-default' },
        { _id: 'b', _index: '.alerts-security.alerts-default' },
      ])
    );
    const result = await verifyAlertIdsInIndex(esClient, 'index', ['a', 'b', 'c']);
    expect(result).toEqual(['a', 'b']);
  });

  it('deduplicates IDs that appear in multiple index families', async () => {
    esClient.search.mockResolvedValueOnce(
      makeIdResponse([
        { _id: 'shared', _index: '.alerts-security.alerts-default' },
        { _id: 'shared', _index: '.attack-discovery-alerts-default' },
      ])
    );
    const result = await verifyAlertIdsInIndex(esClient, 'index', ['shared']);
    expect(result).toEqual(['shared']);
  });

  it('returns empty array when no IDs are found', async () => {
    const result = await verifyAlertIdsInIndex(esClient, 'index', ['missing']);
    expect(result).toEqual([]);
  });

  it('excludes IDs whose only hit is in an Attack Discovery index', async () => {
    // A stale related-alert ID may collide with an AD doc _id in the unified index.
    // The helper must NOT return such IDs through the detection-alert path.
    esClient.search.mockResolvedValueOnce(
      makeIdResponse([
        { _id: 'alert-1', _index: '.alerts-security.alerts-default' },
        { _id: 'ad-only', _index: '.alerts-security.attack.discovery.alerts-default' },
      ])
    );
    const result = await verifyAlertIdsInIndex(esClient, 'index', ['alert-1', 'ad-only']);
    expect(result).toEqual(['alert-1']);
  });

  it('returns an ID that appears in both a detection-alert index and an AD index (non-AD hit wins)', async () => {
    // Same _id in both families: the detection-alert hit should survive AD-exclusion.
    esClient.search.mockResolvedValueOnce(
      makeIdResponse([
        { _id: 'shared', _index: '.alerts-security.alerts-default' },
        { _id: 'shared', _index: '.alerts-security.attack.discovery.alerts-default' },
      ])
    );
    const result = await verifyAlertIdsInIndex(esClient, 'index', ['shared']);
    expect(result).toEqual(['shared']);
  });
});

describe('fetchAlertIdIndexWithSource', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];

  const makeSourceResponse = (
    hits: Array<{ _id: string; _index: string; _source?: Record<string, unknown> }>
  ) =>
    searchResponse({
      hits: {
        total: { value: hits.length, relation: 'eq' },
        hits: hits.map((h) => ({ ...h })),
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    esClient.search.mockResolvedValue(makeSourceResponse([]));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns source alongside id and index for each hit', async () => {
    const mockResp = makeSourceResponse([
      {
        _id: 'id-1',
        _index: '.alerts-security.alerts-default',
        _source: { 'kibana.alert.workflow_tags': ['tag-a'] },
      },
    ]);
    esClient.search.mockResolvedValue(mockResp);
    const result = await fetchAlertIdIndexWithSource(
      esClient,
      'my-index',
      ['id-1'],
      ['kibana.alert.workflow_tags']
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('id-1');
    expect(result[0].index).toBe('.alerts-security.alerts-default');
    expect(result[0].source['kibana.alert.workflow_tags']).toEqual(['tag-a']);
  });

  it('returns empty source object when _source is absent', async () => {
    const mockResp = makeSourceResponse([
      { _id: 'id-1', _index: '.alerts-security.alerts-default' },
    ]);
    esClient.search.mockResolvedValue(mockResp);
    const result = await fetchAlertIdIndexWithSource(esClient, 'my-index', ['id-1'], []);
    expect(result[0].source).toEqual({});
  });

  it('calls search with _source_includes and ignore_unavailable: true', async () => {
    await fetchAlertIdIndexWithSource(
      esClient,
      'my-index',
      ['id-1'],
      ['kibana.alert.workflow_tags']
    );
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source_includes: ['kibana.alert.workflow_tags'],
        ignore_unavailable: true,
      })
    );
  });
});

describe('hits-per-id reservation derived from the index pattern', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: ReturnType<
    typeof requestContextMock.createTools
  >['context']['core']['elasticsearch']['client']['asCurrentUser'];

  const DETECTION_INDEX = '.alerts-security.alerts-default';
  const SCHEDULED_AD_INDEX = '.alerts-security.attack.discovery.alerts-default';
  const ADHOC_AD_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    esClient.search.mockResolvedValue(searchResponse({ hits: { total: 0, hits: [] } }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // The same _id can exist in every index a pattern resolves to and update-by-query mutates
  // all of them, so the result window must reserve a slot per family. Hard-coding the count
  // at each call site is what previously let a three-family pattern drop a changing document.
  it('reserves one hit per index family when prefetching statuses', async () => {
    await prefetchPreviousStatusesByIds(
      esClient,
      [DETECTION_INDEX, SCHEDULED_AD_INDEX, ADHOC_AD_INDEX],
      ['id-1', 'id-2']
    );
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 2 * 3 }));
  });

  it('reserves one hit per index family when resolving id-to-index pairs', async () => {
    await fetchAlertIdToIndex(esClient, [SCHEDULED_AD_INDEX, ADHOC_AD_INDEX], ['id-1', 'id-2']);
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 2 * 2 }));
  });

  it('reserves one hit per index family when fetching sources', async () => {
    await fetchAlertIdIndexWithSource(
      esClient,
      [DETECTION_INDEX, SCHEDULED_AD_INDEX, ADHOC_AD_INDEX],
      ['id-1'],
      ['kibana.alert.workflow_tags']
    );
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 1 * 3 }));
  });

  it('uses a single reserved hit for a single-index pattern', async () => {
    await prefetchPreviousStatusesByIds(esClient, DETECTION_INDEX, ['id-1', 'id-2']);
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 2 }));
  });

  it('shrinks the chunk size so a full chunk never exceeds MAX_ALERTS_PER_TRIGGER', async () => {
    const ids = Array.from({ length: MAX_ALERTS_PER_TRIGGER }, (_, i) => `id-${i}`);
    await prefetchAllPreviousStatusesByIds(
      esClient,
      [DETECTION_INDEX, SCHEDULED_AD_INDEX, ADHOC_AD_INDEX],
      ids
    );
    const requested = esClient.search.mock.calls.flatMap(
      ([params]) => (params as { query?: { ids?: { values?: string[] } } }).query?.ids?.values ?? []
    );
    // Every id is still covered...
    expect(requested).toEqual(ids);
    // ...and no chunk asks Elasticsearch for more than index.max_result_window hits.
    for (const [params] of esClient.search.mock.calls) {
      expect((params as { size?: number }).size).toBeLessThanOrEqual(MAX_ALERTS_PER_TRIGGER);
    }
  });
});

describe('collectStatusTransitions', () => {
  const hit = (overrides: Partial<FoundHit> & { id: string }): FoundHit => ({
    index: '.alerts-security.alerts-default',
    hasStatusField: true,
    ...overrides,
  });

  // The update script only assigns when the status field is non-null, so a status-less
  // document is an Elasticsearch no-op and emitting for it starts a workflow for nothing.
  it('excludes hits with no status field', () => {
    const result = collectStatusTransitions(
      [hit({ id: 'no-status', hasStatusField: false })],
      'closed'
    );
    expect(result.ids).toEqual([]);
    expect(result.previousStatuses).toEqual([]);
  });

  it('excludes hits already at the target status', () => {
    const result = collectStatusTransitions(
      [hit({ id: 'noop', previousStatus: 'closed' })],
      'closed'
    );
    expect(result.ids).toEqual([]);
  });

  // An unrecognized non-null value (e.g. "triaged") is still overwritten by the script, so
  // the ID must be emitted even though there is no valid previousStatuses row for it.
  it('includes a hit with an unrecognized non-null status but omits its previousStatuses row', () => {
    const result = collectStatusTransitions(
      [hit({ id: 'unrecognized', previousStatus: undefined })],
      'closed'
    );
    expect(result.ids).toEqual(['unrecognized']);
    expect(result.previousStatuses).toEqual([]);
  });

  it('deduplicates an id that transitions in more than one index family', () => {
    const result = collectStatusTransitions(
      [
        hit({
          id: 'shared',
          index: '.alerts-security.attack.discovery.alerts-default',
          previousStatus: 'open',
        }),
        hit({
          id: 'shared',
          index: '.adhoc.alerts-security.attack.discovery.alerts-default',
          previousStatus: 'open',
        }),
      ],
      'closed'
    );
    expect(result.ids).toEqual(['shared']);
    expect(result.previousStatuses).toEqual([{ id: 'shared', previousStatus: 'open' }]);
  });

  // Alignment is the invariant the event schema depends on: a consumer must never see a
  // previousStatuses row for an ID that is not in the emitted ID list.
  it('never returns a previousStatuses row for an id absent from ids', () => {
    const result = collectStatusTransitions(
      [
        hit({ id: 'changing', previousStatus: 'open' }),
        hit({ id: 'noop', previousStatus: 'closed' }),
        hit({ id: 'status-less', hasStatusField: false, previousStatus: 'open' }),
      ],
      'closed'
    );
    expect(result.ids).toEqual(['changing']);
    expect(result.previousStatuses.map(({ id }) => id)).toEqual(['changing']);
  });
});

describe('collectChangedIdsByFamily', () => {
  const DETECTION_INDEX = '.alerts-security.alerts-default';
  const SCHEDULED_AD_INDEX = '.alerts-security.attack.discovery.alerts-default';
  const ADHOC_AD_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';
  const changed = () => true;

  it('routes hits to the family matching their index', () => {
    const result = collectChangedIdsByFamily(
      [
        { id: 'alert-1', index: DETECTION_INDEX, source: {} },
        { id: 'attack-1', index: SCHEDULED_AD_INDEX, source: {} },
      ],
      changed
    );
    expect(result.alertIds).toEqual(['alert-1']);
    expect(result.attackIds).toEqual(['attack-1']);
  });

  // The prefetch keeps one hit per (id, index) to survive cross-index _id collisions. Emitting
  // the same ID twice in one family makes a workflow process it repeatedly, and enough
  // duplicates can consume the payload cap and push out uniquely affected IDs.
  it('deduplicates an id present in both attack discovery indices', () => {
    const result = collectChangedIdsByFamily(
      [
        { id: 'shared', index: SCHEDULED_AD_INDEX, source: {} },
        { id: 'shared', index: ADHOC_AD_INDEX, source: {} },
      ],
      changed
    );
    expect(result.attackIds).toEqual(['shared']);
    expect(result.alertIds).toEqual([]);
  });

  // Cross-family collisions are legitimate: the same _id can be a detection alert in one index
  // and an attack in another, and both documents are mutated.
  it('emits an id once per family when it exists in both families', () => {
    const result = collectChangedIdsByFamily(
      [
        { id: 'shared', index: DETECTION_INDEX, source: {} },
        { id: 'shared', index: SCHEDULED_AD_INDEX, source: {} },
      ],
      changed
    );
    expect(result.alertIds).toEqual(['shared']);
    expect(result.attackIds).toEqual(['shared']);
  });

  it('excludes hits the predicate reports as unchanged', () => {
    const result = collectChangedIdsByFamily(
      [
        { id: 'noop', index: DETECTION_INDEX, source: { tags: ['a'] } },
        { id: 'changing', index: DETECTION_INDEX, source: { tags: [] } },
      ],
      (source) => !Array.isArray(source.tags) || source.tags.length === 0
    );
    expect(result.alertIds).toEqual(['changing']);
  });

  it('does not let a duplicate suppress a later unique id', () => {
    const result = collectChangedIdsByFamily(
      [
        { id: 'dup', index: SCHEDULED_AD_INDEX, source: {} },
        { id: 'dup', index: ADHOC_AD_INDEX, source: {} },
        { id: 'unique', index: SCHEDULED_AD_INDEX, source: {} },
      ],
      changed
    );
    expect(result.attackIds).toEqual(['dup', 'unique']);
  });
});
