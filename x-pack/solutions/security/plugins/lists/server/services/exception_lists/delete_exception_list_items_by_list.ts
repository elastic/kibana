/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FoundExceptionListItemSchema,
  ListId,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { findExceptionListItemPointInTimeFinder } from './find_exception_list_item_point_in_time_finder';
import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';

interface DeleteExceptionListItemByListOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteExceptionListItemByList = async ({
  listId,
  savedObjectsClient,
  namespaceType,
}: DeleteExceptionListItemByListOptions): Promise<void> => {
  const ids = await getExceptionListItemIds({ listId, namespaceType, savedObjectsClient });
  await bulkDeleteExceptionListItems({ ids, namespaceType, savedObjectsClient });
};

export const getExceptionListItemIds = async ({
  listId,
  savedObjectsClient,
  namespaceType,
}: DeleteExceptionListItemByListOptions): Promise<string[]> => {
  // Stream the results from the Point In Time (PIT) finder into this array
  let ids: string[] = [];
  const executeFunctionOnStream = (response: FoundExceptionListItemSchema): void => {
    const responseIds = response.data.map((exceptionListItem) => exceptionListItem.id);
    ids = [...ids, ...responseIds];
  };

  await findExceptionListItemPointInTimeFinder({
    executeFunctionOnStream,
    filter: undefined,
    listId,
    maxSize: undefined, // NOTE: This is unbounded when it is "undefined"
    namespaceType,
    perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
    savedObjectsClient,
    sortField: 'tie_breaker_id',
    sortOrder: 'desc',
  });
  return ids;
};
