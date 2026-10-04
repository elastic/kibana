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
import type { SavedObjectsBulkDeleteResponse, SavedObjectsClientContract } from '@kbn/core/server';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { findExceptionListItemPointInTimeFinder } from './find_exception_list_item_point_in_time_finder';
import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';
import { getExceptionListsItemFilter } from './utils/get_exception_lists_item_filter';

interface DeleteExceptionListItemByListOptions {
  listId: ListId;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Throws when a page of item deletes contains a genuine failure. A 404 means the
 * item was already gone (e.g. deleted concurrently) -- that's a no-op, not a
 * failure. Any other error is genuine and must propagate: silently swallowing it
 * would let the bulk-delete path go on to delete the parent list while some of
 * its items are still left behind. This strict handling is scoped to the
 * bulk-delete path only, so the single-delete and `_import` paths keep their
 * original tolerant behavior.
 */
const assertNoUnexpectedItemDeleteErrors = (
  statuses: SavedObjectsBulkDeleteResponse['statuses']
): void => {
  const realErrors = statuses.filter(
    (status) => !status.success && status.error?.statusCode !== 404
  );

  if (realErrors.length > 0) {
    const message = `Failed to delete ${realErrors.length} exception list item(s): ${realErrors
      .map((status) => status.error?.message ?? 'Unknown error')
      .join(', ')}`;
    // Preserve the original ES status code so transformError surfaces it
    // rather than defaulting to 500. When errors have different codes (rare),
    // use the first one -- callers get a meaningful non-500 in the common case.
    const statusCode = realErrors[0].error?.statusCode ?? 500;
    throw Object.assign(new Error(message), { statusCode });
  }
};

/**
 * Deletes all exception list items for a list by accumulating every item id
 * into memory first, then calling bulkDeleteExceptionListItems in one shot.
 * Used by the single-delete path (deleteExceptionList). For bulk-delete use
 * deleteExceptionListItemsByListStreamed instead, which never holds more than
 * one page of ids in memory.
 */
export const deleteExceptionListItemByList = async ({
  listId,
  savedObjectsClient,
  namespaceType,
}: DeleteExceptionListItemByListOptions): Promise<void> => {
  const ids = await getExceptionListItemIds({ listId, namespaceType, savedObjectsClient });
  await bulkDeleteExceptionListItems({ ids, namespaceType, savedObjectsClient });
};

/**
 * Deletes all exception list items belonging to a single list, one page
 * (1,000 items) at a time via a saved objects PIT finder, instead of
 * accumulating every item id for the list into memory before deleting.
 * Bounds peak memory usage to a single page's worth of ids, regardless of
 * how many items the list contains.
 */
export const deleteExceptionListItemsByListStreamed = async ({
  listId,
  namespaceType,
  savedObjectsClient,
}: DeleteExceptionListItemByListOptions): Promise<void> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const filter = getExceptionListsItemFilter({
    filter: [],
    listId: [listId],
    savedObjectType: [savedObjectType],
  });

  const finder = savedObjectsClient.createPointInTimeFinder<ExceptionListSoSchema>({
    filter,
    perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
    sortField: 'tie_breaker_id',
    sortOrder: 'desc',
    type: [savedObjectType],
  });

  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      const ids = savedObjects.map((savedObject) => savedObject.id);
      if (ids.length > 0) {
        const statuses = await bulkDeleteExceptionListItems({
          ids,
          namespaceType,
          savedObjectsClient,
        });
        assertNoUnexpectedItemDeleteErrors(statuses);
      }
    }
  } finally {
    try {
      await finder.close();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (exception) {
      // This is just a pre-caution in case the finder does a throw we don't want to blow up
      // the response. We have seen this within e2e test containers but nothing happen in normal
      // operational conditions which is why this try/catch is here.
    }
  }
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
