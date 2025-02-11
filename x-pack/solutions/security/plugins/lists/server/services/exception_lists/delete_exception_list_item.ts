/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ExceptionListItemSchema,
  Id,
  IdOrUndefined,
  ItemIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { getExceptionListItem } from './get_exception_list_item';

interface DeleteExceptionListItemOptions {
  itemId: ItemIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

interface DeleteExceptionListItemByIdOptions {
  id: Id;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export const deleteExceptionListItem = async ({
  itemId,
  id,
  namespaceType,
  savedObjectsClient,
}: DeleteExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionListItem = await getExceptionListItem({
    id,
    itemId,
    namespaceType,
    savedObjectsClient,
  });
  if (exceptionListItem == null) {
    return null;
  } else {
    await savedObjectsClient.delete(savedObjectType, exceptionListItem.id);
    return exceptionListItem;
  }
};

export const deleteExceptionListItemById = async ({
  id,
  namespaceType,
  savedObjectsClient,
}: DeleteExceptionListItemByIdOptions): Promise<void> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  await savedObjectsClient.delete(savedObjectType, id);
};
