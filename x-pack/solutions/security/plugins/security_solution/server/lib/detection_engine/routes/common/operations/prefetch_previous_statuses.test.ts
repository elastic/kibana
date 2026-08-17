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
  prefetchPreviousStatusesByIds,
  prefetchPreviousStatusesByQuery,
} from './prefetch_previous_statuses';

const makeFoundDoc = (id: string, status: string) => ({
  _id: id,
  found: true as const,
  _source: { [ALERT_WORKFLOW_STATUS]: status },
});

const makeNotFoundDoc = (id: string) => ({ _id: id, found: false as const });

const makeSearchResponse = (
  hits: Array<{ _id: string; status: string }>,
  total: number,
  relation: 'eq' | 'gte' = 'eq'
) => ({
  hits: {
    total: { value: total, relation },
    hits: hits.map(({ _id, status }) => ({
      _id,
      _source: { [ALERT_WORKFLOW_STATUS]: status },
    })),
  },
});

describe('extractWorkflowStatus', () => {
  it('returns "open" for null source', () => {
    expect(extractWorkflowStatus(null)).toBe('open');
  });

  it('returns "open" for undefined source', () => {
    expect(extractWorkflowStatus(undefined)).toBe('open');
  });

  it('returns "open" when the status field is missing', () => {
    expect(extractWorkflowStatus({ other: 'field' })).toBe('open');
  });

  it('returns "open" when the status field is not a string', () => {
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 42 })).toBe('open');
  });

  it('returns the status string when present', () => {
    expect(extractWorkflowStatus({ [ALERT_WORKFLOW_STATUS]: 'acknowledged' })).toBe('acknowledged');
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
    esClient.mget.mockResolvedValue({ docs: [] } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns empty array when no docs are found', async () => {
    const result = await prefetchPreviousStatusesByIds(esClient, 'index', []);
    expect(result).toEqual([]);
  });

  it('returns previous statuses for found docs', async () => {
    esClient.mget.mockResolvedValue({
      docs: [makeFoundDoc('id1', 'acknowledged'), makeFoundDoc('id2', 'closed')],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1', 'id2']);

    expect(result).toEqual([
      { id: 'id1', previousStatus: 'acknowledged' },
      { id: 'id2', previousStatus: 'closed' },
    ]);
  });

  it('skips docs where found is false', async () => {
    esClient.mget.mockResolvedValue({
      docs: [makeFoundDoc('id1', 'open'), makeNotFoundDoc('id2')],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1', 'id2']);

    expect(result).toEqual([{ id: 'id1', previousStatus: 'open' }]);
  });

  it('defaults previousStatus to "open" when source status is not a string', async () => {
    esClient.mget.mockResolvedValue({
      docs: [{ _id: 'id1', found: true, _source: { [ALERT_WORKFLOW_STATUS]: null } }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);

    expect(result).toEqual([{ id: 'id1', previousStatus: 'open' }]);
  });

  it('calls mget with a string index as-is', async () => {
    await prefetchPreviousStatusesByIds(esClient, 'my-index', ['id1']);

    expect(esClient.mget).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'my-index', ids: ['id1'] })
    );
  });

  it('joins an array index with commas before calling mget', async () => {
    await prefetchPreviousStatusesByIds(esClient, ['index-a', 'index-b'], ['id1']);

    expect(esClient.mget).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'index-a,index-b' })
    );
  });

  it('includes ALERT_WORKFLOW_STATUS in _source_includes', async () => {
    await prefetchPreviousStatusesByIds(esClient, 'index', ['id1']);

    expect(esClient.mget).toHaveBeenCalledWith(
      expect.objectContaining({ _source_includes: [ALERT_WORKFLOW_STATUS] })
    );
  });

  it('propagates mget errors to the caller', async () => {
    esClient.mget.mockRejectedValue(new Error('ES error'));

    await expect(prefetchPreviousStatusesByIds(esClient, 'index', ['id1'])).rejects.toThrow(
      'ES error'
    );
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
    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result).toEqual({ ids: [], previousStatuses: [], truncated: false });
  });

  it('returns ids and previousStatuses for each hit', async () => {
    esClient.search.mockResolvedValue(
      makeSearchResponse(
        [
          { _id: 'id1', status: 'closed' },
          { _id: 'id2', status: 'open' },
        ],
        2
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
    );

    const result = await prefetchPreviousStatusesByQuery(esClient, 'index', { match_all: {} });

    expect(result).toEqual({
      ids: ['id1', 'id2'],
      previousStatuses: [
        { id: 'id1', previousStatus: 'closed' },
        { id: 'id2', previousStatus: 'open' },
      ],
      truncated: false,
    });
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
});
