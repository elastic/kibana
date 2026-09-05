/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { getExceptionListItems } from '../../delete_exception_list_items_by_list';
import { bulkDeleteExceptionListItems } from '../../bulk_delete_exception_list_items';

export type ExistingListItem = Pick<
  ExceptionListItemSchema,
  'id' | 'item_id' | 'list_id' | 'namespace_type'
>;

const getItemKey = ({
  item_id: itemId,
  list_id: listId,
  namespace_type: namespaceType,
}: Pick<ImportExceptionListItemSchemaDecoded, 'item_id' | 'list_id' | 'namespace_type'>): string =>
  JSON.stringify([namespaceType, listId, itemId]);

export const getListItemsToBeOverwritten = async ({
  listsOfItemsToDelete,
  savedObjectsClient,
}: {
  listsOfItemsToDelete: Array<[string, NamespaceType]>;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<ExistingListItem[]> => {
  const existingItems: ExistingListItem[] = [];

  for await (const [listId, namespaceType] of listsOfItemsToDelete) {
    const items = await getExceptionListItems({ listId, namespaceType, savedObjectsClient });
    existingItems.push(...items);
  }

  return existingItems;
};

/** Deletes snapshotted list items that are absent from a successful import. */
export const deleteListItemsToBeOverwritten = async ({
  existingItems,
  importedItems,
  savedObjectsClient,
}: {
  existingItems: ExistingListItem[];
  importedItems: ImportExceptionListItemSchemaDecoded[];
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<void> => {
  const importedItemKeys = new Set(importedItems.map(getItemKey));
  const staleItems = existingItems.filter((item) => !importedItemKeys.has(getItemKey(item)));

  for (const namespaceType of ['single', 'agnostic'] as const) {
    const ids = staleItems
      .filter((item) => item.namespace_type === namespaceType)
      .map(({ id }) => id);

    if (ids.length > 0) {
      await bulkDeleteExceptionListItems({ ids, namespaceType, savedObjectsClient });
    }
  }
};
