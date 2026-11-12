/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type {
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteResponse,
  SavedObjectsClientContract,
} from '@kbn/core/server';

interface BulkDeleteExceptionListItemsOptions {
  ids: string[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Bulk deletes exception list items and returns the per-item statuses from the
 * saved objects client. This is intentionally tolerant: it never throws on a
 * per-item failure, matching the behavior relied on by the single-delete and
 * `_import?overwrite=true` paths (via `deleteExceptionListItemByList`) and the
 * `ExceptionListClient.bulkDeleteExceptionListItems` public method. Callers that
 * need strict per-item error handling (the bulk-delete path) should inspect the
 * returned statuses.
 */
export const bulkDeleteExceptionListItems = async ({
  ids,
  namespaceType,
  savedObjectsClient,
}: BulkDeleteExceptionListItemsOptions): Promise<SavedObjectsBulkDeleteResponse['statuses']> => {
  const savedObjectType = getSavedObjectType({ namespaceType });

  const bulkDeleteObjects = ids.map<SavedObjectsBulkDeleteObject>((id) => ({
    id,
    type: savedObjectType,
  }));

  const { statuses } = await savedObjectsClient.bulkDelete(bulkDeleteObjects);

  return statuses;
};
