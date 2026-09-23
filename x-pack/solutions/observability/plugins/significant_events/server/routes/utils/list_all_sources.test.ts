/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { listAllSources } from './list_all_sources';

const source = (id: string): NightshiftSource =>
  ({
    id,
    enabled: true,
  } as NightshiftSource);

describe('listAllSources', () => {
  it('pages until the reported total is loaded', async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce({
        sources: [source('a'), source('b')],
        total: 3,
        page: 1,
        per_page: 100,
      })
      .mockResolvedValueOnce({
        sources: [source('c')],
        total: 3,
        page: 2,
        per_page: 100,
      });
    const sourcesClient = { list } as unknown as SourcesClient;

    await expect(listAllSources(sourcesClient, { enabled: true })).resolves.toEqual([
      source('a'),
      source('b'),
      source('c'),
    ]);
    expect(list).toHaveBeenNthCalledWith(1, { page: 1, perPage: 100, enabled: true });
    expect(list).toHaveBeenNthCalledWith(2, { page: 2, perPage: 100, enabled: true });
  });
});
