/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enumerateSpaceIds } from './enumerate_space_ids';

const page = (ids: string[]) => ({
  page: 1,
  per_page: ids.length,
  saved_objects: ids.map((id) => ({ attributes: {}, id, references: [], score: 1, type: 'space' })),
  total: ids.length,
});

describe('enumerateSpaceIds', () => {
  it('returns every space id, always including the default space', async () => {
    const find = jest.fn().mockResolvedValue(page(['space-a', 'space-b']));

    await expect(
      enumerateSpaceIds({
        pageSize: 10,
        signal: new AbortController().signal,
        spaceRepository: { find },
      })
    ).resolves.toEqual(['default', 'space-a', 'space-b']);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 10, type: 'space' })
    );
  });

  it('does not repeat the default space when it has a saved object', async () => {
    const find = jest.fn().mockResolvedValue(page(['default', 'space-a']));

    await expect(
      enumerateSpaceIds({
        pageSize: 10,
        signal: new AbortController().signal,
        spaceRepository: { find },
      })
    ).resolves.toEqual(['default', 'space-a']);
  });

  it('pages until a page comes back short', async () => {
    const find = jest
      .fn()
      .mockResolvedValueOnce(page(['space-a', 'space-b']))
      .mockResolvedValueOnce(page(['space-c', 'space-d']))
      .mockResolvedValueOnce(page(['space-e']));

    await expect(
      enumerateSpaceIds({
        pageSize: 2,
        signal: new AbortController().signal,
        spaceRepository: { find },
      })
    ).resolves.toEqual(['default', 'space-a', 'space-b', 'space-c', 'space-d', 'space-e']);
    expect(find.mock.calls.map(([options]) => options.page)).toEqual([1, 2, 3]);
  });

  it('stops paging once the run is aborted', async () => {
    const controller = new AbortController();
    const find = jest.fn().mockImplementation(async () => {
      controller.abort();
      return page(['space-a', 'space-b']);
    });

    await enumerateSpaceIds({ pageSize: 2, signal: controller.signal, spaceRepository: { find } });

    expect(find).toHaveBeenCalledTimes(1);
  });
});
