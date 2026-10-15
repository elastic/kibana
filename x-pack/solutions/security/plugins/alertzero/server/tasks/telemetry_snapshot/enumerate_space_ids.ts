/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * Lists every space id from the `space` saved objects, always including the default space (it
 * may have no object). Pages until a page comes back short, and stops paging once aborted.
 */
export const enumerateSpaceIds = async ({
  pageSize,
  signal,
  spaceRepository,
}: {
  pageSize: number;
  signal: AbortSignal;
  spaceRepository: Pick<SavedObjectsClientContract, 'find'>;
}): Promise<string[]> => {
  const listFrom = async (page: number): Promise<string[]> => {
    const { saved_objects: spaces } = await spaceRepository.find({
      page,
      perPage: pageSize,
      type: 'space',
    });
    const ids = spaces.map(({ id }) => id);
    return ids.length < pageSize || signal.aborted ? ids : [...ids, ...(await listFrom(page + 1))];
  };

  return [...new Set([DEFAULT_SPACE_ID, ...(await listFrom(1))])];
};
