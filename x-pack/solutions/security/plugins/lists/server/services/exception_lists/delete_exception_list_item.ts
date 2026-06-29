/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ExceptionListItemSchema,
  Id,
  IdOrUndefined,
  ItemIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { RefreshFalseOrWaitFor } from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionListItem } from './get_exception_list_item';
import { toSavedObjectRefresh } from './utils';

interface DeleteExceptionListItemOptions {
  itemId: ItemIdOrUndefined;
  id: IdOrUndefined;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: RefreshFalseOrWaitFor;
}

interface DeleteExceptionListItemByIdOptions {
  id: Id;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: RefreshFalseOrWaitFor;
}

export const deleteExceptionListItem = async ({
  itemId,
  id,
  namespaceType,
  savedObjectsClient,
  refresh,
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
    await savedObjectsClient.delete(savedObjectType, exceptionListItem.id, {
      refresh: toSavedObjectRefresh(refresh),
    });
    return exceptionListItem;
  }
};

export const deleteExceptionListItemById = async ({
  id,
  namespaceType,
  savedObjectsClient,
  refresh,
}: DeleteExceptionListItemByIdOptions): Promise<void> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  await savedObjectsClient.delete(savedObjectType, id, { refresh: toSavedObjectRefresh(refresh) });
};
