/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import type { SecuritySolutionRequestHandlerContextMock } from '../../__mocks__/request_context';
import { requestContextMock } from '../../__mocks__';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../../common/workflows/triggers';
import {
  extractWorkflowStatus,
  fetchAlertIdToIndex,
  prefetchPreviousStatusesByIds,
  prefetchPreviousStatusesByQuery,
} from './prefetch_previous_statuses';

const makeSearchResponse = (
  hits: Array<{ _id: string; status: string; _index?: string }>,
  total: number,
  relation: 'eq' | 'gte' = 'eq'
) => ({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esClient.search.mockResolvedValue(makeSearchResponse([], 0) as any);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
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
    esClient.search.mockResolvedValue({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _id: 'id1', _source: { [ALERT_WORKFLOW_STATUS]: 'open' } }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { previousStatuses, idToIndex } = await prefetchPreviousStatusesByIds(esClient, 'index', [
      'id1',
    ]);

    expect(previousStatuses).toEqual([{ id: 'id1', previousStatus: 'open' }]);
    expect(idToIndex.size).toBe(0);
  });

  it('only processes docs returned as search hits (not-found docs are simply absent)', async () => {
    esClient.search.mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeSearchResponse([{ _id: 'id1', status: 'open' }], 1) as any
    );

    const { previousStatuses } = await prefetchPreviousStatusesByIds(esClient, 'index', [
      'id1',
      'id2',
    ]);

    expect(previousStatuses).toEqual([{ id: 'id1', previousStatus: 'open' }]);
  });

  it('omits the previousStatus entry when source status is not a valid WorkflowStatus', async () => {
    esClient.search.mockResolvedValue({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _id: 'id1', _index: 'test-index', _source: { [ALERT_WORKFLOW_STATUS]: null } }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { previousStatuses } = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);

    expect(previousStatuses).toEqual([]);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esClient.search.mockResolvedValue(makeSearchResponse([], 0) as any);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
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
    esClient.search.mockResolvedValue({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _id: 'id1', _source: { [ALERT_WORKFLOW_STATUS]: 'open' } }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { previousStatuses, idToIndex } = await prefetchPreviousStatusesByQuery(
      esClient,
      'index',
      { match_all: {} }
    );

    expect(previousStatuses).toEqual([{ id: 'id1', previousStatus: 'open' }]);
    expect(idToIndex.size).toBe(0);
  });

  it('sets truncated to true when total exceeds MAX_ALERTS_PER_TRIGGER (eq relation)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esClient.search.mockResolvedValue(makeSearchResponse([], MAX_ALERTS_PER_TRIGGER + 1) as any);

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(true);
  });

  it('sets truncated to true when ES returns gte relation at the track_total_hits boundary', async () => {
    // Real ES returns relation:'gte' when total > track_total_hits (MAX_ALERTS_PER_TRIGGER + 1).
    // value equals exactly MAX_ALERTS_PER_TRIGGER + 1 in that case.
    esClient.search.mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeSearchResponse([], MAX_ALERTS_PER_TRIGGER + 1, 'gte') as any
    );

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(true);
  });

  it('does not set truncated when total equals MAX_ALERTS_PER_TRIGGER exactly', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esClient.search.mockResolvedValue(makeSearchResponse([], MAX_ALERTS_PER_TRIGGER) as any);

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(false);
  });

  it('handles numeric total hits format', async () => {
    esClient.search.mockResolvedValue({
      hits: { total: MAX_ALERTS_PER_TRIGGER + 1, hits: [] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result.truncated).toBe(true);
  });

  it('wraps the query in bool.filter when calling search', async () => {
    const query = { term: { status: 'open' } };

    await prefetchPreviousStatusesByQuery(esClient, 'index', query);

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: { bool: { filter: query } } })
    );
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

  it('adds must_not for the modern status field only when excludeStatus is provided', async () => {
    const query = { term: { 'some.field': 'value' } };

    await prefetchPreviousStatusesByQuery(esClient, 'index', query, undefined, 'closed');

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: query,
            must_not: { term: { [ALERT_WORKFLOW_STATUS]: 'closed' } },
          },
        },
      })
    );
  });

  it('omits must_not when excludeStatus is not provided', async () => {
    const query = { term: { 'some.field': 'value' } };

    await prefetchPreviousStatusesByQuery(esClient, 'index', query);

    const call = (esClient.search as unknown as jest.Mock).mock.calls[0][0];
    expect(call.query.bool).not.toHaveProperty('must_not');
  });
});

describe('fetchAlertIdToIndex', () => {
  let context: SecuritySolutionRequestHandlerContextMock;
  let esClient: SecuritySolutionRequestHandlerContextMock['core']['elasticsearch']['client']['asCurrentUser'];

  const makeIdToIndexResponse = (hits: Array<{ _id: string; _index: string }>) => ({
    hits: {
      total: { value: hits.length, relation: 'eq' },
      hits: hits.map((h) => ({ _id: h._id, _index: h._index })),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ({ context } = requestContextMock.createTools());
    esClient = context.core.elasticsearch.client.asCurrentUser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esClient.search.mockResolvedValue(makeIdToIndexResponse([]) as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns an empty map when no hits are returned', async () => {
    const result = await fetchAlertIdToIndex(esClient, 'index', []);
    expect(result.size).toBe(0);
  });

  it('maps each hit _id to its _index', async () => {
    const response = makeIdToIndexResponse([
      { _id: 'id-1', _index: '.alerts-security.alerts-default' },
      { _id: 'id-2', _index: '.internal.alerts-security.alerts-default-000001' },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    esClient.search.mockResolvedValue(response as any);
    const result = await fetchAlertIdToIndex(esClient, 'index', ['id-1', 'id-2']);
    expect(result.get('id-1')).toBe('.alerts-security.alerts-default');
    expect(result.get('id-2')).toBe('.internal.alerts-security.alerts-default-000001');
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
