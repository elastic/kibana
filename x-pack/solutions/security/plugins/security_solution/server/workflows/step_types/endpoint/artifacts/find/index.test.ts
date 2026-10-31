/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type {
  ArtifactItem,
  findEndpointArtifactsInputSchema,
} from '../../../../../../common/workflows/step_types/endpoint/artifacts';
import { findEndpointArtifactsOutputSchema } from '../../../../../../common/workflows/step_types/endpoint/artifacts';
import {
  findEndpointArtifactsStepDefinition,
  formatEntriesSummary,
  formatEntriesSummaryRow,
} from '.';

type Context = StepHandlerContext<typeof findEndpointArtifactsInputSchema>;

const createMockItem = (overrides: Partial<ArtifactItem> = {}): ArtifactItem =>
  ({
    id: 'so-id-1',
    item_id: 'item-1',
    list_id: 'endpoint_trusted_apps',
    type: 'simple',
    name: 'Trusted App 1',
    description: 'A trusted test application',
    entries: [
      {
        field: 'process.executable.caseless',
        type: 'match',
        operator: 'included',
        value: 'C:\\test.exe',
      },
    ],
    namespace_type: 'agnostic',
    os_types: ['windows'],
    tags: ['policy:policy-123'],
    comments: [],
    tie_breaker_id: 'tie-1',
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: 'elastic',
    updated_at: '2024-01-02T00:00:00.000Z',
    updated_by: 'elastic',
    _version: 'WzEsMV0=',
    ...overrides,
  } as ArtifactItem);

describe('findEndpointArtifactsStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
      getScopedEsClient: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;
  });

  it('queries exactly one list per call with default paging and agnostic namespace', async () => {
    const item1 = createMockItem({ item_id: 'item-1' });
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: {
        total: 1,
        page: 1,
        per_page: 100,
        data: [item1],
      },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/exception_lists/items/_find?namespace_type=agnostic&list_id=endpoint_trusted_apps&page=1&per_page=100',
    });

    expect(result.output!.unauthorized).toBe(false);
    expect(result.output!.items).toHaveLength(1);
    expect(result.output!.items[0].item_id).toBe('item-1');
    expect(result.output!.population).toEqual({
      total: 1,
      fetched: 1,
      truncated: false,
      fetch_unstable: false,
      unauthorized: false,
    });
  });

  it('rejects an out-of-contract fetch cap before reading any artifacts', async () => {
    const context = {
      input: { list_id: 'endpoint_trusted_apps', fetch_cap: 2001 },
      contextManager: mockContextManager,
    } as unknown as Context;

    await expect(findEndpointArtifactsStepDefinition.handler(context)).rejects.toThrow();
    expect(mockContextManager.callKibanaApi).not.toHaveBeenCalled();
  });

  it('pages in chunks of 100 up to fetch_cap', async () => {
    const page1Items = Array.from({ length: 100 }, (_, i) =>
      createMockItem({ item_id: `item-${i}` })
    );
    const page2Items = Array.from({ length: 50 }, (_, i) =>
      createMockItem({ item_id: `item-${100 + i}` })
    );

    mockContextManager.callKibanaApi
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: {
          total: 150,
          page: 1,
          per_page: 100,
          data: page1Items,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: {
          total: 150,
          page: 2,
          per_page: 100,
          data: page2Items,
        },
      });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        fetch_cap: 2000,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
    expect(mockContextManager.callKibanaApi).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/api/exception_lists/items/_find?namespace_type=agnostic&list_id=endpoint_trusted_apps&page=1&per_page=100',
    });
    expect(mockContextManager.callKibanaApi).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/api/exception_lists/items/_find?namespace_type=agnostic&list_id=endpoint_trusted_apps&page=2&per_page=100',
    });

    expect(result.output!.items).toHaveLength(150);
    expect(result.output!.population).toEqual({
      total: 150,
      fetched: 150,
      truncated: false,
      fetch_unstable: false,
      unauthorized: false,
    });
  });

  it('stops paging when fetch_cap is reached', async () => {
    const page1Items = Array.from({ length: 100 }, (_, i) =>
      createMockItem({ item_id: `item-${i}` })
    );

    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: {
        total: 500,
        page: 1,
        per_page: 100,
        data: page1Items,
      },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        fetch_cap: 100,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
    expect(result.output!.items).toHaveLength(100);
    expect(result.output!.population).toEqual({
      total: 500,
      fetched: 100,
      truncated: true,
      fetch_unstable: false,
      unauthorized: false,
    });
  });

  it('passes item_ids resolution filter to the route', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 0, page: 1, per_page: 100, data: [] },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        item_ids: ['id-alpha', 'id-beta'],
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    await findEndpointArtifactsStepDefinition.handler(context);

    const call = mockContextManager.callKibanaApi.mock.calls[0][0];
    const url = new URL(`http://localhost${call.path}`);
    expect(url.searchParams.get('list_id')).toBe('endpoint_trusted_apps');
    expect(url.searchParams.get('namespace_type')).toBe('agnostic');
    expect(url.searchParams.get('filter')).toBe(
      'exception-list-agnostic.attributes.item_id:("id-alpha" OR "id-beta")'
    );
  });

  it('combines os, policy_id, and item_ids filters with AND', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 0, page: 1, per_page: 100, data: [] },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        os: 'windows' as const,
        policy_id: 'Policy (Default)',
        item_ids: ['id:1'],
        search: 'test search',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    await findEndpointArtifactsStepDefinition.handler(context);

    const call = mockContextManager.callKibanaApi.mock.calls[0][0];
    const url = new URL(`http://localhost${call.path}`);
    expect(url.searchParams.get('search')).toBe('test search');
    const filter = url.searchParams.get('filter') ?? '';
    expect(filter).toContain('exception-list-agnostic.attributes.os_types:"windows"');
    expect(filter).toContain('policy:Policy (Default)');
    expect(filter).toContain('exception-list-agnostic.attributes.item_id:("id:1")');
    expect(filter.split(' AND ')).toHaveLength(3);
  });

  it('de-duplicates items across pages by item_id preserving first occurrence', async () => {
    const item1 = createMockItem({ item_id: 'dup-1', name: 'First Encounter' });
    const item2 = createMockItem({ item_id: 'item-2', name: 'Item 2' });
    const item1Dup = createMockItem({ item_id: 'dup-1', name: 'Second Encounter' });

    mockContextManager.callKibanaApi
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: { total: 3, page: 1, per_page: 100, data: [item1, item2] },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: {},
        body: { total: 3, page: 2, per_page: 100, data: [item1Dup] },
      });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(result.output!.items).toHaveLength(2);
    expect(result.output!.items[0].name).toBe('First Encounter');
    expect(result.output!.items[1].name).toBe('Item 2');
    expect(result.output!.population.fetched).toBe(2);
    expect(result.output!.population.fetch_unstable).toBe(true);
  });

  it('computes population accurately for clean cap vs fetch_unstable', async () => {
    const items = Array.from({ length: 90 }, (_, i) => createMockItem({ item_id: `id-${i}` }));
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 100, page: 1, per_page: 100, data: items },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        fetch_cap: 2000,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(result.output!.population).toEqual({
      total: 100,
      fetched: 90,
      truncated: false,
      fetch_unstable: true,
      unauthorized: false,
    });
  });

  it('passes sort_field and sort_order to the route', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 0, page: 1, per_page: 100, data: [] },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        sort_field: 'updated_at',
        sort_order: 'desc' as const,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    await findEndpointArtifactsStepDefinition.handler(context);

    const call = mockContextManager.callKibanaApi.mock.calls[0][0];
    const url = new URL(`http://localhost${call.path}`);
    expect(url.searchParams.get('sort_field')).toBe('updated_at');
    expect(url.searchParams.get('sort_order')).toBe('desc');
  });

  it('sorts in memory by updated_at asc, item_id asc when sort is updated_at_item_id', async () => {
    const itemA = createMockItem({ item_id: 'b-id', updated_at: '2024-03-01T00:00:00.000Z' });
    const itemB = createMockItem({ item_id: 'a-id', updated_at: '2024-01-01T00:00:00.000Z' });
    const itemC = createMockItem({ item_id: 'c-id', updated_at: '2024-01-01T00:00:00.000Z' });

    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 3, page: 1, per_page: 100, data: [itemA, itemB, itemC] },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
        sort: 'updated_at_item_id' as const,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(result.output!.items.map((i) => i.item_id)).toEqual(['a-id', 'c-id', 'b-id']);
  });

  it('slices by offset and limit, returning correct next_offset', async () => {
    const items = Array.from({ length: 10 }, (_, i) => createMockItem({ item_id: `id-${i}` }));
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 10, page: 1, per_page: 100, data: items },
    });

    const contextWithNext = {
      input: {
        list_id: 'endpoint_trusted_apps',
        offset: 2,
        limit: 5,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result1 = await findEndpointArtifactsStepDefinition.handler(contextWithNext);
    expect(result1.output!.items).toHaveLength(5);
    expect(result1.output!.items[0].item_id).toBe('id-2');
    expect(result1.output!.next_offset).toBe(7);

    const contextExhausted = {
      input: {
        list_id: 'endpoint_trusted_apps',
        offset: 7,
        limit: 5,
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result2 = await findEndpointArtifactsStepDefinition.handler(contextExhausted);
    expect(result2.output!.items).toHaveLength(3);
    expect(result2.output!.items[0].item_id).toBe('id-7');
    expect(result2.output!.next_offset).toBeNull();
  });

  it('produces summaries exclusively through toArtifactRef with accurate entries_summary', async () => {
    const item = createMockItem({
      item_id: 'sum-1',
      tags: ['policy:policy-alpha', 'ownerSpaceId:marketing'],
      description: 'Test description',
      entries: [
        {
          field: 'process.executable.caseless',
          type: 'match',
          operator: 'included',
          value: 'cmd.exe',
        },
        {
          field: 'file.path.text',
          type: 'match_any',
          operator: 'included',
          value: ['/tmp/1', '/tmp/2', '/tmp/3'],
        },
        {
          field: 'process.Ext.code_signature',
          type: 'nested',
          entries: [
            {
              field: 'subject_name',
              type: 'match',
              operator: 'included',
              value: 'Microsoft',
            },
            {
              field: 'trusted',
              type: 'match',
              operator: 'included',
              value: 'true',
            },
          ],
        },
      ],
    });

    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: 1, page: 1, per_page: 100, data: [item] },
    });

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(result.output!.summaries).toHaveLength(1);
    const summary = result.output!.summaries[0];
    expect(summary.item_id).toBe('sum-1');
    expect(summary.family).toBe('trusted_apps');
    expect(summary.policy_scope).toEqual({
      kind: 'policies',
      policy_ids: ['policy-alpha'],
      owner_space_id: 'marketing',
    });
    expect(summary.description).toBe('Test description');
    expect(summary.entries_summary).toEqual([
      'process.executable included cmd.exe',
      'file.path included /tmp/1 (+2)',
      'process.Ext.code_signature: subject_name included Microsoft and process.Ext.code',
    ]);
  });

  it('returns unauthorized: true with items: [] on 403 KibanaApiCallError', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 403,
        message: 'Forbidden',
        headers: {},
        body: {},
      })
    );

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(result.output).toEqual({
      items: [],
      summaries: [],
      population: {
        total: 0,
        fetched: 0,
        truncated: false,
        fetch_unstable: false,
        unauthorized: true,
      },
      next_offset: null,
      unauthorized: true,
    });
  });

  it('returns unauthorized: false with items: [] on 404 KibanaApiCallError (list not yet created)', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 404,
        message: 'Not Found',
        headers: {},
        body: { message: 'exception list id: "endpoint_event_filters" does not exist' },
      })
    );

    const context = {
      input: {
        list_id: 'endpoint_event_filters',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    const result = await findEndpointArtifactsStepDefinition.handler(context);

    expect(result.output).toEqual({
      items: [],
      summaries: [],
      population: {
        total: 0,
        fetched: 0,
        truncated: false,
        fetch_unstable: false,
        unauthorized: false,
      },
      next_offset: null,
      unauthorized: false,
    });
  });

  it('propagates a 500 error as an ExecutionError (never unavailable or empty success)', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 500,
        message: 'Internal Server Error',
        headers: {},
        body: {},
      })
    );

    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
      },
      contextManager: mockContextManager,
    } as unknown as Context;

    await expect(findEndpointArtifactsStepDefinition.handler(context)).rejects.toThrow(
      ExecutionError
    );
  });
});

describe('formatEntriesSummary', () => {
  it('formats match_any with 1 value without (+N)', () => {
    const rows = formatEntriesSummary([
      {
        field: 'file.path.caseless',
        type: 'match_any',
        operator: 'included',
        value: ['/usr/bin/python'],
      },
    ]);
    expect(rows).toEqual(['file.path included /usr/bin/python']);
  });

  it('formats exists and list entries', () => {
    const rows = formatEntriesSummary([
      {
        field: 'process.name',
        type: 'exists',
        operator: 'included',
      },
      {
        field: 'file.hash',
        type: 'list',
        operator: 'included',
        list: { id: 'known-malware', type: 'endpoint' },
      },
    ]);
    expect(rows).toEqual(['process.name included', 'file.hash included known-malware']);
  });

  it('caps at 5 rows and appends +N more', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      field: `field_${i}`,
      type: 'match',
      operator: 'included',
      value: `val_${i}`,
    }));
    const rows = formatEntriesSummary(entries);
    expect(rows).toHaveLength(6);
    expect(rows.slice(0, 5)).toEqual([
      'field_0 included val_0',
      'field_1 included val_1',
      'field_2 included val_2',
      'field_3 included val_3',
      'field_4 included val_4',
    ]);
    expect(rows[5]).toBe('+3 more');
  });

  it('truncates rows exceeding 80 characters to exactly 80 characters', () => {
    const longValue = 'A'.repeat(100);
    const row = formatEntriesSummaryRow({
      field: 'process.executable',
      type: 'match',
      operator: 'included',
      value: longValue,
    });
    expect(row).toHaveLength(80);
  });
});

describe('findEndpointArtifacts summary bounds', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
      getScopedEsClient: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;
  });

  const runFind = async (items: ArtifactItem[]) => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { total: items.length, page: 1, per_page: 100, data: items },
    });
    const context = {
      input: {
        list_id: 'endpoint_trusted_apps',
      },
      contextManager: mockContextManager,
    } as unknown as Context;
    const result = await findEndpointArtifactsStepDefinition.handler(context);
    return { result, summaries: result.output!.summaries };
  };

  const runFindSummaries = async (items: ArtifactItem[]) => (await runFind(items)).summaries;

  it('returns a bounded output that passes the step output schema', async () => {
    const tags = Array.from({ length: 20 }, (_, index) => `policy:policy-${index}`);
    const { result } = await runFind([
      createMockItem({ name: 'n'.repeat(300), description: 'd'.repeat(2000), tags }),
    ]);

    expect(findEndpointArtifactsOutputSchema.safeParse(result.output).success).toBe(true);
  });

  it('cuts name and description and records the cut with flags', async () => {
    const [summary] = await runFindSummaries([
      createMockItem({ name: 'n'.repeat(300), description: 'd'.repeat(2000) }),
    ]);

    expect(summary.name).toHaveLength(128);
    expect(summary.name_truncated).toBe(true);
    expect(summary.description).toHaveLength(256);
    expect(summary.description_truncated).toBe(true);
  });

  it('keeps the first five policy tags whole, counts the full list, and caps policy_ids at ten', async () => {
    const tags = Array.from({ length: 20 }, (_, index) => `policy:policy-${index}`);
    const [summary] = await runFindSummaries([createMockItem({ tags })]);

    expect(summary.tags).toEqual([
      'policy:policy-0',
      'policy:policy-1',
      'policy:policy-2',
      'policy:policy-3',
      'policy:policy-4',
    ]);
    expect(summary.tags_total).toBe(20);
    expect(summary.tags_truncated).toBeUndefined();
    expect(summary.policy_scope.policy_ids).toHaveLength(10);
    expect(summary.policy_scope.policy_ids_total).toBe(20);
  });

  it('keeps long identifiers whole', async () => {
    const longItemId = 'i'.repeat(80);
    const longPolicyId = 'p'.repeat(80);
    const longOwnerSpaceId = 'o'.repeat(80);
    const [summary] = await runFindSummaries([
      createMockItem({
        item_id: longItemId,
        tags: [`policy:${longPolicyId}`, `ownerSpaceId:${longOwnerSpaceId}`],
      }),
    ]);

    expect(summary.item_id).toBe(longItemId);
    expect(summary.policy_scope.policy_ids).toEqual([longPolicyId]);
    expect(summary.policy_scope.owner_space_id).toBe(longOwnerSpaceId);
    expect(summary.tags).toEqual([`policy:${longPolicyId}`, `ownerSpaceId:${longOwnerSpaceId}`]);
    expect(summary.tags_truncated).toBeUndefined();
  });

  it('cuts a long non-identifier tag and records tags_truncated', async () => {
    const [summary] = await runFindSummaries([createMockItem({ tags: ['x'.repeat(100)] })]);

    expect(summary.tags).toEqual(['x'.repeat(64)]);
    expect(summary.tags_truncated).toBe(true);
    expect(summary.tags_total).toBeUndefined();
  });

  it('omits totals when no list was cut', async () => {
    const [summary] = await runFindSummaries([createMockItem({ tags: ['policy:a', 'note'] })]);

    expect(summary.tags_total).toBeUndefined();
    expect(summary.policy_scope.policy_ids_total).toBeUndefined();
    expect(summary.tags_truncated).toBeUndefined();
    expect(summary.name_truncated).toBeUndefined();
    expect(summary.description_truncated).toBeUndefined();
  });

  it('computes kind all from the full tag set even when policy:all is past the fifth tag', async () => {
    const tags = ['policy:p1', 'policy:p2', 'policy:p3', 'policy:p4', 'policy:p5', 'policy:all'];
    const [summary] = await runFindSummaries([createMockItem({ tags })]);

    expect(summary.policy_scope.kind).toBe('all');
    expect(summary.tags).toHaveLength(5);
    expect(summary.tags_total).toBe(6);
  });

  it('keeps an unknown os_types value and de-duplicates values', async () => {
    const [summary] = await runFindSummaries([
      createMockItem({
        os_types: ['windows', 'windows', 'plan9'] as unknown as ArtifactItem['os_types'],
      }),
    ]);

    expect(summary.os_types).toEqual(['windows', 'plan9']);
  });
});
