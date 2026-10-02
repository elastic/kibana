/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { badRequest, conflict, notFound } from '@hapi/boom';
import { MAX_KEYWORD_LENGTH } from '../../common';
import type { MemoryPage } from '../../common/memory';
import {
  MAX_PAGE_SIZE,
  MAX_TAG_FILTER_TERMS,
  MAX_TAG_TERM_LENGTH,
  MemoryVersionConflictError,
} from '../memory/page_store';
import { archiveMemoryPageRoute } from './archive_memory_page';
import { deleteMemoryPageRoute } from './delete_memory_page';
import { getMemoryAvailabilityRoute } from './get_memory_availability';
import { getMemoryLineageRoute } from './get_memory_lineage';
import { getMemoryPageRoute } from './get_memory_page';
import { listMemoryPagesRoute } from './list_memory_pages';

const memory = (overrides: Partial<MemoryPage> = {}): MemoryPage =>
  ({
    id: 'memory_kafka-lag',
    slug: 'kafka-lag',
    title: 'Kafka consumer lag',
    content: '',
    tags: ['memory'],
    archived: false,
    archive_reason: undefined,
    categories: [],
    references: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: 'investigator',
    updated_by: 'investigator',
    telemetry: {
      impressions: 10,
      conversions: 5,
      last_impression_time: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  } as unknown as MemoryPage);

/** Handler resources plus the parsed params for one request. */
const context = (store: unknown, enabled: boolean, params: unknown = { path: { id: '' } }) =>
  ({
    request: {},
    params,
    getMemoryPageStore: () => store,
    isMemoryEnabled: () => enabled,
  } as never);

const ID = 'memory_kafka-lag';
const path = (id: string = ID) => ({ path: { id } });

describe('getMemoryAvailabilityRoute', () => {
  const { handler } = getMemoryAvailabilityRoute['GET /internal/nightshift/memory/availability'];

  it('reports the flag so the tab can be hidden', async () => {
    await expect(handler({ isMemoryEnabled: () => true } as never)).resolves.toEqual({
      enabled: true,
    });
    await expect(handler({ isMemoryEnabled: () => false } as never)).resolves.toEqual({
      enabled: false,
    });
  });
});

describe('listMemoryPagesRoute', () => {
  const { handler } = listMemoryPagesRoute['GET /internal/nightshift/memory/pages'];

  it('defaults to the unfiltered list and forwards the cursor', async () => {
    const listPaginated = jest.fn().mockResolvedValue({ pages: [], cursor: undefined });
    await handler(context({ listPaginated }, true, { query: { size: 10, cursor: 'abc' } }));

    expect(listPaginated).toHaveBeenCalledWith({
      filter: 'all',
      cursor: 'abc',
      size: 10,
      tags: undefined,
    });
  });

  it('reports disabled as not found rather than an empty list', async () => {
    const listPaginated = jest.fn();
    await expect(handler(context({ listPaginated }, false, { query: {} }))).rejects.toEqual(
      notFound('Semantic Memory is not enabled')
    );
    expect(listPaginated).not.toHaveBeenCalled();
  });

  it('passes the page, stats, total and cursor straight through', async () => {
    const result = {
      pages: [],
      total: 137,
      cursor: 'next-page',
      stats: { total: 137, archived: 12 },
    };
    const listPaginated = jest.fn().mockResolvedValue(result);

    await expect(handler(context({ listPaginated }, true, { query: {} }))).resolves.toEqual(result);
  });

  it('defaults the filter to all rather than to a narrower set', async () => {
    const listPaginated = jest.fn().mockResolvedValue({ pages: [] });
    await handler(context({ listPaginated }, true, { query: {} }));

    expect(listPaginated).toHaveBeenCalledWith({
      filter: 'all',
      cursor: undefined,
      size: undefined,
      tags: undefined,
    });
  });

  it('forwards the repeated tag terms so the store can group them by keyword', async () => {
    const listPaginated = jest.fn().mockResolvedValue({ pages: [] });
    await handler(
      context({ listPaginated }, true, {
        query: { filter: 'active', tags: ['invoke-agent', 'invoke_agent', 'cart cache'] },
      })
    );

    expect(listPaginated).toHaveBeenCalledWith({
      filter: 'active',
      cursor: undefined,
      size: undefined,
      tags: ['invoke-agent', 'invoke_agent', 'cart cache'],
    });
  });
});

describe('memory route request bounds', () => {
  // The handlers above are called with already-parsed params, so the bounds are
  // asserted on the schemas themselves: an unbounded id or size is an
  // unbounded-input DoS on a route that reaches Elasticsearch.
  // Each entry is [endpoint, params schema] rather than the repository, so the
  // heterogeneous route records do not have to be indexed by a union of keys.
  const routes: Array<[string, { safeParse: (value: unknown) => { success: boolean } }]> = [
    [
      'GET /internal/nightshift/memory/pages/{id}',
      getMemoryPageRoute['GET /internal/nightshift/memory/pages/{id}'].params,
    ],
    [
      'GET /internal/nightshift/memory/pages/{id}/lineage',
      getMemoryLineageRoute['GET /internal/nightshift/memory/pages/{id}/lineage'].params,
    ],
    [
      'POST /internal/nightshift/memory/pages/{id}/archive',
      archiveMemoryPageRoute['POST /internal/nightshift/memory/pages/{id}/archive'].params,
    ],
    [
      'DELETE /internal/nightshift/memory/pages/{id}',
      deleteMemoryPageRoute['DELETE /internal/nightshift/memory/pages/{id}'].params,
    ],
  ];

  // The write routes also require a body, so every case carries one: the read
  // routes strip the unknown key rather than rejecting it.
  const withId = (id: string) => ({
    path: { id },
    body: { archived: true, confirm_title: 'Kafka consumer lag' },
  });

  it.each(routes)('rejects an over-long id on %s', (_endpoint, params) => {
    expect(params.safeParse(withId('m'.repeat(MAX_KEYWORD_LENGTH + 1))).success).toBe(false);
  });

  it.each(routes)('accepts an id at the bound on %s', (_endpoint, params) => {
    expect(params.safeParse(withId('m'.repeat(MAX_KEYWORD_LENGTH))).success).toBe(true);
  });

  it('rejects an empty id', () => {
    const params = getMemoryPageRoute['GET /internal/nightshift/memory/pages/{id}'].params;
    expect(params.safeParse(withId('')).success).toBe(false);
  });

  it('rejects an archive request with no decision to make', () => {
    const params =
      archiveMemoryPageRoute['POST /internal/nightshift/memory/pages/{id}/archive'].params;
    expect(params.safeParse({ path: { id: ID } }).success).toBe(false);
    expect(params.safeParse({ path: { id: ID }, body: { archived: 'yes' } }).success).toBe(false);
  });

  it.each([
    ['above the page-size cap', MAX_PAGE_SIZE + 1],
    ['zero', 0],
    ['negative', -1],
    ['fractional', 1.5],
  ])('rejects a list size %s', (_label, size) => {
    const params = listMemoryPagesRoute['GET /internal/nightshift/memory/pages'].params;
    expect(params.safeParse({ query: { size } }).success).toBe(false);
  });

  it('rejects an unknown list filter rather than silently listing everything', () => {
    const params = listMemoryPagesRoute['GET /internal/nightshift/memory/pages'].params;
    expect(params.safeParse({ query: { filter: 'everything' } }).success).toBe(false);
  });

  it.each([
    ['an empty tag term', ['']],
    ['an over-long tag term', ['t'.repeat(MAX_TAG_TERM_LENGTH + 1)]],
    [
      'more terms than the tag bound',
      Array.from({ length: MAX_TAG_FILTER_TERMS + 1 }, (_, i) => `t${i}`),
    ],
  ])('rejects %s on the list route', (_label, tags) => {
    const params = listMemoryPagesRoute['GET /internal/nightshift/memory/pages'].params;
    expect(params.safeParse({ query: { tags } }).success).toBe(false);
  });

  it('accepts the full set of tag terms the client can send', () => {
    const params = listMemoryPagesRoute['GET /internal/nightshift/memory/pages'].params;
    const tags = Array.from({ length: MAX_TAG_FILTER_TERMS }, (_, i) => `t${i}`);
    expect(params.safeParse({ query: { tags } }).success).toBe(true);
  });

  it('rejects an over-long cursor and an over-long confirm title', () => {
    const list = listMemoryPagesRoute['GET /internal/nightshift/memory/pages'].params;
    expect(list.safeParse({ query: { cursor: 'c'.repeat(4097) } }).success).toBe(false);

    const remove = deleteMemoryPageRoute['DELETE /internal/nightshift/memory/pages/{id}'].params;
    expect(
      remove.safeParse({
        path: { id: ID },
        body: { confirm_title: 't'.repeat(MAX_KEYWORD_LENGTH + 1) },
      }).success
    ).toBe(false);
  });
});

describe('getMemoryPageRoute', () => {
  const { handler } = getMemoryPageRoute['GET /internal/nightshift/memory/pages/{id}'];

  it('returns the page with its decayed usefulness and confidence', async () => {
    const page = memory();
    const get = jest.fn().mockResolvedValue(page);
    const result = await handler(context({ get }, true, path()));

    expect(result).toEqual(
      expect.objectContaining({
        page,
        usefulness: expect.any(Number),
        confidence: expect.any(Number),
      })
    );
  });

  it('throws not found for a missing page', async () => {
    const get = jest.fn().mockResolvedValue(undefined);
    await expect(handler(context({ get }, true, path()))).rejects.toEqual(
      notFound(`Semantic Memory page ${ID} was not found`)
    );
  });

  it('throws not found when Semantic Memory is disabled', async () => {
    const get = jest.fn();
    await expect(handler(context({ get }, false, path()))).rejects.toEqual(
      notFound('Semantic Memory is not enabled')
    );
    expect(get).not.toHaveBeenCalled();
  });
});

describe('archiveMemoryPageRoute', () => {
  const { handler } = archiveMemoryPageRoute['POST /internal/nightshift/memory/pages/{id}/archive'];

  it('archives with the manual reason so a person is distinguishable', async () => {
    const archive = jest
      .fn()
      .mockResolvedValue(memory({ archived: true, archive_reason: 'manual' }));
    await handler(context({ archive }, true, { path: { id: ID }, body: { archived: true } }));

    expect(archive).toHaveBeenCalledWith(ID, 'manual');
  });

  it('unarchives through the batched clear rather than archive', async () => {
    const unarchive = jest.fn().mockResolvedValue(memory());
    await handler(context({ unarchive }, true, { path: { id: ID }, body: { archived: false } }));

    expect(unarchive).toHaveBeenCalledWith(ID);
  });

  it('throws not found when the page does not exist', async () => {
    const archive = jest.fn().mockResolvedValue(undefined);
    await expect(
      handler(context({ archive }, true, { path: { id: ID }, body: { archived: true } }))
    ).rejects.toEqual(notFound(`Semantic Memory page ${ID} was not found`));
  });

  it('returns the page with its decayed numbers so the UI need not recompute them', async () => {
    const archived = memory({ archived: true, archive_reason: 'manual' });
    const result = await handler(
      context({ archive: jest.fn().mockResolvedValue(archived) }, true, {
        path: { id: ID },
        body: { archived: true },
      })
    );

    expect(result).toEqual({
      page: archived,
      usefulness: expect.any(Number),
      confidence: expect.any(Number),
    });
  });

  it('answers 409 rather than 500 when the archive loses its version race', async () => {
    const archive = jest
      .fn()
      .mockRejectedValue(new MemoryVersionConflictError('Memory archive exhausted 3 conflicts'));

    await expect(
      handler(context({ archive }, true, { path: { id: ID }, body: { archived: true } }))
    ).rejects.toEqual(
      conflict('The memory changed while you were reviewing it. Reload and try again.')
    );
  });

  it('answers 409 when restoring loses its version race too', async () => {
    const unarchive = jest
      .fn()
      .mockRejectedValue(new MemoryVersionConflictError('Memory unarchive exhausted 3 conflicts'));

    await expect(
      handler(context({ unarchive }, true, { path: { id: ID }, body: { archived: false } }))
    ).rejects.toEqual(
      conflict('The memory changed while you were reviewing it. Reload and try again.')
    );
  });

  it('does not disguise an unrelated archive failure as a conflict', async () => {
    const archive = jest.fn().mockRejectedValue(new Error('index unavailable'));

    await expect(
      handler(context({ archive }, true, { path: { id: ID }, body: { archived: true } }))
    ).rejects.toThrow('index unavailable');
  });

  it('throws not found when Semantic Memory is disabled', async () => {
    const archive = jest.fn();
    await expect(
      handler(context({ archive }, false, { path: { id: ID }, body: { archived: true } }))
    ).rejects.toEqual(notFound('Semantic Memory is not enabled'));
    expect(archive).not.toHaveBeenCalled();
  });
});

describe('deleteMemoryPageRoute', () => {
  const { handler } = deleteMemoryPageRoute['DELETE /internal/nightshift/memory/pages/{id}'];
  const body = (confirm_title: string) => ({ path: { id: ID }, body: { confirm_title } });
  const versioned = (page: MemoryPage) => ({ page, seqNo: 7, primaryTerm: 1 });
  /** A store whose `getVersioned` answers with `page`, or nothing when it is absent. */
  const storeWith = (
    page: MemoryPage | undefined,
    remove = jest.fn().mockResolvedValue(undefined)
  ) => ({
    getVersioned: jest.fn().mockResolvedValue(page ? versioned(page) : undefined),
    delete: remove,
  });

  it('deletes only when the confirmed title matches', async () => {
    const store = storeWith(memory());

    await handler(context(store, true, body('Kafka consumer lag')));

    // Conditional on the version that was read, so a concurrent optimizer write
    // cannot slip a document past the confirmation.
    expect(store.delete).toHaveBeenCalledWith(ID, versioned(memory()));
  });

  it('refuses a stale or mistyped title, and reports the real one', async () => {
    const store = storeWith(memory());

    await expect(handler(context(store, true, body('something else')))).rejects.toEqual(
      badRequest('confirm_title does not match the page title', { title: 'Kafka consumer lag' })
    );
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('throws not found rather than confirming against a missing page', async () => {
    const store = storeWith(undefined);

    await expect(handler(context(store, true, body('Kafka consumer lag')))).rejects.toEqual(
      notFound(`Semantic Memory page ${ID} was not found`)
    );
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('answers 409 rather than 500 when the document changed under the confirmation', async () => {
    const store = storeWith(
      memory(),
      jest.fn().mockRejectedValue(new MemoryVersionConflictError('Memory changed'))
    );

    await expect(handler(context(store, true, body('Kafka consumer lag')))).rejects.toEqual(
      conflict('The memory changed while you were reviewing it. Reload and try again.')
    );
  });

  it('does not disguise an unrelated delete failure as a conflict', async () => {
    const store = storeWith(memory(), jest.fn().mockRejectedValue(new Error('cluster blocked')));

    await expect(handler(context(store, true, body('Kafka consumer lag')))).rejects.toThrow(
      'cluster blocked'
    );
  });

  it('throws not found when Semantic Memory is disabled', async () => {
    const getVersioned = jest.fn();
    await expect(
      handler(context({ getVersioned }, false, body('Kafka consumer lag')))
    ).rejects.toEqual(notFound('Semantic Memory is not enabled'));
    expect(getVersioned).not.toHaveBeenCalled();
  });
});
