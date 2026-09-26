/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import type { CortexPage } from '../../common/cortex';
import { createCortexPageRoute, updateCortexPageRoute } from './write_cortex_page';

const { handler: create } = createCortexPageRoute['POST /internal/nightshift/cortex/pages'];
const { handler: update } = updateCortexPageRoute['PUT /internal/nightshift/cortex/pages'];

const body = {
  entity_type: 'service' as const,
  slug: 'checkout',
  title: 'Checkout',
  content: '## Overview',
  status: 'tentative' as const,
};

const page: CortexPage = {
  id: 'cortex_service_checkout',
  slug: 'checkout',
  title: 'Checkout',
  entity_type: 'service',
  status: 'tentative',
  corroborations: 0,
  updated_at: '2026-09-26T12:00:00.000Z',
  content: '## Overview',
};

const setup = ({ existing, enabled = true }: { existing?: CortexPage; enabled?: boolean } = {}) => {
  const store = {
    get: jest.fn().mockResolvedValue(existing),
    upsert: jest.fn().mockResolvedValue(page),
  };
  const context = {
    request: {},
    params: { body },
    isCortexEnabled: () => enabled,
    getCortexPageStore: () => store,
  } as never;
  return { store, context };
};

describe('createCortexPageRoute', () => {
  it('throws when Cortex is disabled', async () => {
    const { context } = setup({ enabled: false });
    await expect(create(context)).rejects.toEqual(notFound('Cortex is not enabled'));
  });

  it('refuses to overwrite an existing page', async () => {
    const { store, context } = setup({ existing: page });
    await expect(create(context)).rejects.toEqual(
      conflict('Cortex page cortex_service_checkout already exists')
    );
    expect(store.upsert).not.toHaveBeenCalled();
  });

  it('writes a new page', async () => {
    const { store, context } = setup();
    await expect(create(context)).resolves.toEqual({ page });
    expect(store.get).toHaveBeenCalledWith('cortex_service_checkout');
    expect(store.upsert).toHaveBeenCalledWith({
      entityType: 'service',
      slug: 'checkout',
      title: 'Checkout',
      content: '## Overview',
      status: 'tentative',
    });
  });
});

describe('updateCortexPageRoute', () => {
  it('overwrites the page without an existence check', async () => {
    const { store, context } = setup({ existing: page });
    await expect(update(context)).resolves.toEqual({ page });
    expect(store.get).not.toHaveBeenCalled();
    expect(store.upsert).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'service' }));
  });
});
