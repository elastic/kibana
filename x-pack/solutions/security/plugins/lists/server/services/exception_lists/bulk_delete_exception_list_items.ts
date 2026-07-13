/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { SavedObjectsBulkDeleteObject, SavedObjectsClientContract } from '@kbn/core/server';

interface BulkDeleteExceptionListItemsOptions {
  ids: string[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export const bulkDeleteExceptionListItems = async ({
  ids,
  namespaceType,
  savedObjectsClient,
}: BulkDeleteExceptionListItemsOptions): Promise<void> => {
  const savedObjectType = getSavedObjectType({ namespaceType });

  const bulkDeleteObjects = ids.map<SavedObjectsBulkDeleteObject>((id) => ({
    id,
    type: savedObjectType,
  }));

  const { statuses } = await savedObjectsClient.bulkDelete(bulkDeleteObjects);

  // A 404 means the item was already gone (e.g. deleted concurrently) -- that's a
  // no-op, not a failure. Any other error is genuine and must propagate: silently
  // swallowing it would let the caller go on to delete the parent list while some
  // of its items are still left behind.
  const realErrors = statuses.filter(
    (status) => !status.success && status.error?.statusCode !== 404
  );

  if (realErrors.length > 0) {
    throw new Error(
      `Failed to delete ${realErrors.length} exception list item(s): ${realErrors
        .map((status) => status.error?.message ?? 'Unknown error')
        .join(', ')}`
    );
  }
};
