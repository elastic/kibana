/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

const PAGE_SIZE = 1000;

/**
 * Enumerates every Kibana space id via the internal saved-objects repository.
 * Always includes `'default'` (it may lack an explicit space SO). The `space`
 * type is hidden, so callers must pass a repository created with
 * `createInternalRepository(['space'])` or `find` returns nothing.
 *
 * Paginates until a page comes back short of `PAGE_SIZE`, so deployments
 * with more than one page of spaces don't silently lose the tail.
 */
export const enumerateSpaceIds = async (
  spaceRepository: Pick<SavedObjectsClientContract, 'find'>
): Promise<string[]> => {
  const namespaces = new Set<string>(['default']);

  let page = 1;
  let fetched;
  do {
    const spacesResponse = await spaceRepository.find({
      type: 'space',
      perPage: PAGE_SIZE,
      page,
    });
    for (const so of spacesResponse.saved_objects) {
      namespaces.add(so.id);
    }
    fetched = spacesResponse.saved_objects.length;
    page += 1;
  } while (fetched === PAGE_SIZE);

  return [...namespaces];
};
