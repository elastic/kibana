/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import type { CortexPage } from '../../common/cortex';
import { archiveCortexPageRoute } from './archive_cortex_page';

const { handler } = archiveCortexPageRoute['DELETE /internal/nightshift/cortex/pages/{id}'];

const run = (id: string, resolved: CortexPage | undefined) => {
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
    params: { path: { id } },
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
  expect(store.archive).toHaveBeenCalledWith('cortex_service_checkout');
});

it('folds legacy duplicates first and archives the canonical page', async () => {
  const canonical = { id: 'cortex_service_email-service', status: 'established' } as CortexPage;
  const { store, result } = run('cortex_service_cortex-service-email-service', canonical);
  await result;
  expect(store.pruneDuplicates.mock.invocationCallOrder[0]).toBeLessThan(
    store.get.mock.invocationCallOrder[0]
  );
  expect(store.archive).toHaveBeenCalledWith('cortex_service_email-service');
});

it('throws not found for a missing page', async () => {
  const { store, result } = run('cortex_service_checkout', undefined);
  await expect(result).rejects.toEqual(
    notFound('Cortex page cortex_service_checkout was not found')
  );
  expect(store.archive).not.toHaveBeenCalled();
});
