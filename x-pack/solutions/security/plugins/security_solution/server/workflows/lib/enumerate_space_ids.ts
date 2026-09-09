/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

/**
 * Enumerates every Kibana space id via the internal saved-objects repository.
 * Always includes `'default'` (it may lack an explicit space SO). The `space`
 * type is hidden, so callers must pass a repository created with
 * `createInternalRepository(['space'])` or `find` returns nothing.
 */
export const enumerateSpaceIds = async (
  spaceRepository: Pick<SavedObjectsClientContract, 'find'>
): Promise<string[]> => {
  const spacesResponse = await spaceRepository.find({
    type: 'space',
    perPage: 1000,
  });

  const namespaces = new Set<string>(['default']);
  for (const so of spacesResponse.saved_objects) {
    namespaces.add(so.id);
  }
  return [...namespaces];
};
