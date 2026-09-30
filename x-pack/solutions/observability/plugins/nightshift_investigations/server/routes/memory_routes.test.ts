/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { badRequest, notFound } from '@hapi/boom';
import type { MemoryPage } from '../../common/memory';
import { archiveMemoryPageRoute } from './archive_memory_page';
import { deleteMemoryPageRoute } from './delete_memory_page';
import { getMemoryAvailabilityRoute } from './get_memory_availability';
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

    expect(listPaginated).toHaveBeenCalledWith({ filter: 'all', cursor: 'abc', size: 10 });
  });

  it('reports disabled as not found rather than an empty list', async () => {
    const listPaginated = jest.fn();
    await expect(handler(context({ listPaginated }, false, { query: {} }))).rejects.toEqual(
      notFound('Semantic Memory is not enabled')
    );
    expect(listPaginated).not.toHaveBeenCalled();
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
});

describe('deleteMemoryPageRoute', () => {
  const { handler } = deleteMemoryPageRoute['DELETE /internal/nightshift/memory/pages/{id}'];
  const body = (confirm_title: string) => ({ path: { id: ID }, body: { confirm_title } });

  it('deletes only when the confirmed title matches', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    const store = { get: jest.fn().mockResolvedValue(memory()), delete: remove };

    await handler(context(store, true, body('Kafka consumer lag')));

    expect(remove).toHaveBeenCalledWith(ID);
  });

  it('refuses a stale or mistyped title, and reports the real one', async () => {
    const remove = jest.fn();
    const store = { get: jest.fn().mockResolvedValue(memory()), delete: remove };

    await expect(handler(context(store, true, body('something else')))).rejects.toEqual(
      badRequest('confirm_title does not match the page title', { title: 'Kafka consumer lag' })
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('throws not found rather than confirming against a missing page', async () => {
    const remove = jest.fn();
    const store = { get: jest.fn().mockResolvedValue(undefined), delete: remove };

    await expect(handler(context(store, true, body('Kafka consumer lag')))).rejects.toEqual(
      notFound(`Semantic Memory page ${ID} was not found`)
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('throws not found when Semantic Memory is disabled', async () => {
    const get = jest.fn();
    await expect(handler(context({ get }, false, body('Kafka consumer lag')))).rejects.toEqual(
      notFound('Semantic Memory is not enabled')
    );
    expect(get).not.toHaveBeenCalled();
  });
});
