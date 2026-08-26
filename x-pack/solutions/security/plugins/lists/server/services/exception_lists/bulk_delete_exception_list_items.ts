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

  await savedObjectsClient.bulkDelete(bulkDeleteObjects);
};
