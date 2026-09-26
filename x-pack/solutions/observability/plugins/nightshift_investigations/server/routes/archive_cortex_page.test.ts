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

const run = (archived: CortexPage | undefined) => {
  const archive = jest.fn().mockResolvedValue(archived);
  const result = handler({
    request: {},
    params: { path: { id: 'cortex_service_checkout' } },
    isCortexEnabled: () => true,
    getCortexPageStore: () => ({ archive }),
  } as never);
  return { archive, result };
};

it('archives the page and returns it', async () => {
  const page = { id: 'cortex_service_checkout', status: 'archived' } as CortexPage;
  const { archive, result } = run(page);
  await expect(result).resolves.toEqual({ page });
  expect(archive).toHaveBeenCalledWith('cortex_service_checkout');
});

it('throws not found for a missing page', async () => {
  await expect(run(undefined).result).rejects.toEqual(
    notFound('Cortex page cortex_service_checkout was not found')
  );
});
