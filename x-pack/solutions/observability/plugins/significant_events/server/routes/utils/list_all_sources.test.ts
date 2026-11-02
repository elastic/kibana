/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { StatusError } from '../../lib/errors/status_error';
import { listAllSources } from './list_all_sources';

const source = (id: string): NightshiftSource =>
  ({
    id,
  } as NightshiftSource);

describe('listAllSources', () => {
  it('returns the page when it covers the reported total', async () => {
    const sourcesClient = {
      list: jest.fn().mockResolvedValue({
        sources: [source('a')],
        total: 1,
        page: 1,
        per_page: 10_000,
      }),
    } as unknown as SourcesClient;

    await expect(listAllSources(sourcesClient)).resolves.toEqual([source('a')]);
  });

  it('throws when the catalog is larger than the page', async () => {
    const sourcesClient = {
      list: jest.fn().mockResolvedValue({
        sources: [source('a')],
        total: 10_001,
        page: 1,
        per_page: 10_000,
      }),
    } as unknown as SourcesClient;

    await expect(listAllSources(sourcesClient)).rejects.toBeInstanceOf(StatusError);
    await expect(listAllSources(sourcesClient)).rejects.toMatchObject({ statusCode: 500 });
  });
});
