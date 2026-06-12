/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ExportExceptionDetails,
  FoundExceptionListItemSchema,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { findExceptionListItemPointInTimeFinder } from './find_exception_list_item_point_in_time_finder';
import { getExceptionList } from './get_exception_list';

interface ExportExceptionListAndItemsOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  includeExpiredExceptions: boolean;
  /** Optional KQL filter to be applied to the data that will be retrieved for export */
  filter?: string;
}

export interface ExportExceptionListAndItemsReturn {
  exportData: string;
  exportDetails: ExportExceptionDetails;
}

export const exportExceptionListAndItems = async ({
  id,
  listId,
  namespaceType,
  includeExpiredExceptions,
  savedObjectsClient,
  filter: dataFilter = undefined,
}: ExportExceptionListAndItemsOptions): Promise<ExportExceptionListAndItemsReturn | null> => {
  const exceptionList = await getExceptionList({
    id,
    listId,
    namespaceType,
    savedObjectsClient,
  });

  if (exceptionList == null) {
    return null;
  } else {
    // Stream the results from the Point In Time (PIT) finder into this array
    let exceptionItems: ExceptionListItemSchema[] = [];
    const executeFunctionOnStream = (response: FoundExceptionListItemSchema): void => {
      exceptionItems = [...exceptionItems, ...response.data];
    };
    const savedObjectPrefix = getSavedObjectType({ namespaceType });
    let filter = dataFilter;

    if (!includeExpiredExceptions) {
      const noExpiredItemsFilter = `(${savedObjectPrefix}.attributes.expire_time > "${new Date().toISOString()}" OR NOT ${savedObjectPrefix}.attributes.expire_time: *)`;

      if (filter) {
        filter = `(${filter}) AND ${noExpiredItemsFilter}`;
      } else {
        filter = noExpiredItemsFilter;
      }
    }

    await findExceptionListItemPointInTimeFinder({
      executeFunctionOnStream,
      filter,
      listId: exceptionList.list_id,
      maxSize: undefined, // NOTE: This is unbounded when it is "undefined"
      namespaceType: exceptionList.namespace_type,
      perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
      savedObjectsClient,
      sortField: 'exception-list.created_at',
      sortOrder: 'desc',
    });
    const { exportData } = getExport([exceptionList, ...exceptionItems]);

    // TODO: Add logic for missing lists and items on errors
    return {
      exportData: `${exportData}`,
      exportDetails: {
        exported_exception_list_count: 1,
        exported_exception_list_item_count: exceptionItems.length,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
      },
    };
  }
};

export const getExport = (
  data: unknown[]
): {
  exportData: string;
} => {
  const ndjson = transformDataToNdjson(data);

  return { exportData: ndjson };
};
