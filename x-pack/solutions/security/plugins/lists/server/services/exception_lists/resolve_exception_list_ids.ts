/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ExceptionListSchema,
  ListId,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionList } from './get_exception_list';

interface ResolveExceptionListIdsOptions {
  listIds: ListId[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface ResolveExceptionListIdsResult {
  /** exception lists resolved from the given list_ids, already fetched and validated */
  lists: ExceptionListSchema[];
  /** list_ids that could not be resolved to an existing list */
  listIds: ListId[];
}

/**
 * Resolves human-readable `list_id`s to their underlying exception lists.
 * Each lookup already fetches the full list, so the caller does not need a
 * separate existence check afterwards.
 */
export const resolveExceptionListIds = async ({
  listIds,
  namespaceType,
  savedObjectsClient,
}: ResolveExceptionListIdsOptions): Promise<ResolveExceptionListIdsResult> => {
  if (listIds.length === 0) {
    return { listIds: [], lists: [] };
  }

  const resolved = await Promise.all(
    listIds.map(async (listId) => ({
      list: await getExceptionList({ id: undefined, listId, namespaceType, savedObjectsClient }),
      listId,
    }))
  );

  const lists: ExceptionListSchema[] = [];
  const unresolvedListIds: ListId[] = [];

  resolved.forEach(({ list, listId }) => {
    if (list != null) {
      lists.push(list);
    } else {
      unresolvedListIds.push(listId);
    }
  });

  return { listIds: unresolvedListIds, lists };
};
