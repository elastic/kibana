/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enumerateSpaceIds } from './enumerate_space_ids';

describe('enumerateSpaceIds', () => {
  it('returns default plus every space saved-object id', async () => {
    const spaceRepository = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [{ id: 'space-a' }, { id: 'space-b' }],
      }),
    };

    await expect(enumerateSpaceIds(spaceRepository)).resolves.toEqual([
      'default',
      'space-a',
      'space-b',
    ]);
    expect(spaceRepository.find).toHaveBeenCalledWith({ type: 'space', perPage: 1000, page: 1 });
  });

  it('always includes default even when no space documents exist', async () => {
    const spaceRepository = {
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
    };

    await expect(enumerateSpaceIds(spaceRepository)).resolves.toEqual(['default']);
  });

  it('does not duplicate default when a default space document exists', async () => {
    const spaceRepository = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [{ id: 'default' }, { id: 'space-a' }],
      }),
    };

    await expect(enumerateSpaceIds(spaceRepository)).resolves.toEqual(['default', 'space-a']);
  });

  it('paginates when a page comes back full, stopping once a short page is seen', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({ id: `space-${i}` }));
    const find = jest
      .fn()
      .mockResolvedValueOnce({ saved_objects: fullPage })
      .mockResolvedValueOnce({ saved_objects: [{ id: 'space-last' }] });
    const spaceRepository = { find };

    const result = await enumerateSpaceIds(spaceRepository);

    expect(find).toHaveBeenCalledTimes(2);
    expect(find).toHaveBeenNthCalledWith(1, { type: 'space', perPage: 1000, page: 1 });
    expect(find).toHaveBeenNthCalledWith(2, { type: 'space', perPage: 1000, page: 2 });
    expect(result).toContain('space-last');
    expect(result).toHaveLength(1002); // default + 1000 + 1
  });
});
