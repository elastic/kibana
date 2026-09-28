/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import type { CortexPage } from '../../common/cortex';
import { archiveCortexPageRoute } from './archive_cortex_page';

const { handler, params } = archiveCortexPageRoute['DELETE /internal/nightshift/cortex/pages/{id}'];

const run = (id: string, resolved: CortexPage | undefined, version?: string) => {
  const store = {
    pruneDuplicates: jest.fn().mockResolvedValue(0),
    get: jest.fn().mockResolvedValue(resolved),
    archive: jest.fn().mockImplementation(async (pageId: string) => ({
      ...resolved,
      id: pageId,
      status: 'archived',
    })),
  };
  const result = handler({
    request: {},
    params: { path: { id }, query: { version } },
    isCortexEnabled: () => true,
    getCortexPageStore: () => store,
  } as never);
  return { store, result };
};

it('archives the page and returns it', async () => {
  const page = { id: 'cortex_service_checkout', status: 'established' } as CortexPage;
  const { store, result } = run('cortex_service_checkout', page);
  await expect(result).resolves.toEqual({
    page: expect.objectContaining({ id: 'cortex_service_checkout', status: 'archived' }),
  });
  expect(store.archive).toHaveBeenCalledWith('cortex_service_checkout', undefined);
});

it('folds legacy duplicates first and archives the canonical page', async () => {
  const canonical = { id: 'cortex_service_email-service', status: 'established' } as CortexPage;
  const { store, result } = run('cortex_service_cortex-service-email-service', canonical);
  await result;
  expect(store.pruneDuplicates.mock.invocationCallOrder[0]).toBeLessThan(
    store.get.mock.invocationCallOrder[0]
  );
  expect(store.archive).toHaveBeenCalledWith('cortex_service_email-service', undefined);
});

it('throws not found for a missing page', async () => {
  const { store, result } = run('cortex_service_checkout', undefined);
  await expect(result).rejects.toEqual(
    notFound('Cortex page cortex_service_checkout was not found')
  );
  expect(store.archive).not.toHaveBeenCalled();
});

it('archives only the version the caller loaded', async () => {
  const page = { id: 'cortex_service_checkout', status: 'established' } as CortexPage;
  const { store, result } = run('cortex_service_checkout', page, '7:1');
  await result;
  expect(store.archive).toHaveBeenCalledWith('cortex_service_checkout', '7:1');
});

it('throws conflict when the page changed since it was loaded', async () => {
  const page = { id: 'cortex_service_checkout', status: 'established' } as CortexPage;
  const { store, result } = run('cortex_service_checkout', page, '7:1');
  store.archive.mockRejectedValueOnce({ statusCode: 409 });
  await expect(result).rejects.toEqual(
    conflict(
      'Cortex page cortex_service_checkout changed since it was loaded. Reload it and try again.'
    )
  );
});

it('requires the version the page was loaded at', () => {
  const path = { id: 'cortex_service_checkout' };
  expect(params?.safeParse({ path, query: {} }).success).toBe(false);
  expect(params?.safeParse({ path, query: { version: '7:1' } }).success).toBe(true);
});
