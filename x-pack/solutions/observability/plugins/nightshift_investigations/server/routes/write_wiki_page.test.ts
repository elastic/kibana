/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import type { WikiPage } from '../../common/wiki';
import { createWikiPageRoute, updateWikiPageRoute } from './write_wiki_page';

const { handler: create } = createWikiPageRoute['POST /internal/nightshift/wiki/pages'];
const { handler: update, params: updateParams } =
  updateWikiPageRoute['PUT /internal/nightshift/wiki/pages'];

const body = {
  entity_type: 'service' as const,
  slug: 'checkout',
  title: 'Checkout',
  content: '## Overview',
  status: 'tentative' as const,
};

const page: WikiPage = {
  id: 'wiki_service_checkout',
  slug: 'checkout',
  title: 'Checkout',
  entity_type: 'service',
  status: 'tentative',
  corroborations: 0,
  updated_at: '2026-09-26T12:00:00.000Z',
  content: '## Overview',
};

const setup = ({
  existing,
  enabled = true,
  overrides = {},
}: { existing?: WikiPage; enabled?: boolean; overrides?: Record<string, string> } = {}) => {
  const store = {
    pruneDuplicates: jest.fn().mockResolvedValue(0),
    get: jest.fn().mockResolvedValue(existing),
    create: jest.fn().mockResolvedValue(existing ? undefined : page),
    upsert: jest.fn().mockResolvedValue(page),
  };
  const context = {
    request: {},
    params: { body: { ...body, ...overrides } },
    isWikiEnabled: () => enabled,
    getWikiPageStore: () => store,
  } as never;
  return { store, context };
};

describe('createWikiPageRoute', () => {
  it('throws when Wiki is disabled', async () => {
    const { context } = setup({ enabled: false });
    await expect(create(context)).rejects.toEqual(notFound('Wiki is not enabled'));
  });

  it('refuses to overwrite an existing page', async () => {
    const { store, context } = setup({ existing: page });
    await expect(create(context)).rejects.toEqual(
      conflict('Wiki page wiki_service_checkout already exists')
    );
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('writes a new page', async () => {
    const { store, context } = setup();
    await expect(create(context)).resolves.toEqual({ page });
    expect(store.pruneDuplicates.mock.invocationCallOrder[0]).toBeLessThan(
      store.create.mock.invocationCallOrder[0]
    );
    expect(store.create).toHaveBeenCalledWith({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout',
      content: '## Overview',
      status: 'tentative',
    });
  });
});

describe('updateWikiPageRoute', () => {
  it('requires the version the page was loaded at', () => {
    expect(updateParams?.safeParse({ body }).success).toBe(false);
    expect(updateParams?.safeParse({ body: { ...body, version: '7:1' } }).success).toBe(true);
  });

  it('overwrites the page without a create-only write', async () => {
    const { store, context } = setup({ existing: page });
    await expect(update(context)).resolves.toEqual({ page });
    expect(store.create).not.toHaveBeenCalled();
    expect(store.pruneDuplicates.mock.invocationCallOrder[0]).toBeLessThan(
      store.upsert.mock.invocationCallOrder[0]
    );
    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'service' }));
  });

  it('throws not found instead of creating a missing page', async () => {
    const { store, context } = setup();
    await expect(update(context)).rejects.toEqual(
      notFound('Wiki page wiki_service_checkout was not found')
    );
    expect(store.get).toHaveBeenCalledWith('wiki_service_checkout');
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('writes against the version the caller loaded and rejects a stale one', async () => {
    const { store, context } = setup({ existing: page, overrides: { version: '7:1' } });
    store.upsert.mockRejectedValueOnce({ statusCode: 409 });
    await expect(update(context)).rejects.toEqual(
      conflict(
        'Wiki page wiki_service_checkout changed since it was loaded. Reload it and try again.'
      )
    );
    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ version: '7:1' }));
  });
});
