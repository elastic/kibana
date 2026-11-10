/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, internal } from '@hapi/boom';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { filterReadableSourceIds } from './resolve_source_ids';

const sourcesClientWith = (assertReadable: jest.Mock): SourcesClient =>
  ({ assertReadable } as unknown as SourcesClient);

describe('filterReadableSourceIds', () => {
  it('drops the sources the caller is denied and keeps the order of the rest', async () => {
    const assertReadable = jest.fn(async (id: string) => {
      if (id === 'denied') {
        throw forbidden(`Cannot read source ${id}`);
      }
    });

    await expect(
      filterReadableSourceIds(['a', 'denied', 'b'], sourcesClientWith(assertReadable))
    ).resolves.toEqual(['a', 'b']);
  });

  it('rethrows a failure that is not a denial', async () => {
    const assertReadable = jest.fn().mockRejectedValue(internal('boom'));

    await expect(filterReadableSourceIds(['a'], sourcesClientWith(assertReadable))).rejects.toThrow(
      'boom'
    );
  });
});
