/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExportExceptionDetails,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { findExceptionListPointInTimeFinder } from './find_exception_list_point_in_time_finder';
import { findExceptionListsItemsPointInTimeFinder } from './find_exception_lists_items_point_in_time_finder';

interface ExportExceptionListsAndItemsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  includeExpiredExceptions: boolean;
  filter: string | undefined;
}

export interface ExportExceptionListsAndItemsReturn {
  exportData: string;
  exportDetails: ExportExceptionDetails;
}

export const exportExceptionListsAndItems = async ({
  namespaceType,
  includeExpiredExceptions,
  savedObjectsClient,
  filter: dataFilter,
}: ExportExceptionListsAndItemsOptions): Promise<ExportExceptionListsAndItemsReturn | null> => {
  const exceptionLists: ExceptionListSchema[] = [];
  const listIds: string[] = [];
  const namespaceTypes: NamespaceType[] = [];

  const appendExceptionList = (response: FoundExceptionListSchema): void => {
    response.data.forEach((list) => {
      exceptionLists.push(list);
      listIds.push(list.list_id);
      namespaceTypes.push(list.namespace_type);
    });
  };

  await findExceptionListPointInTimeFinder({
    executeFunctionOnStream: appendExceptionList,
    filter: dataFilter,
    maxSize: 10_000,
    namespaceType: [namespaceType],
    perPage: 1_000,
    savedObjectsClient,
    sortField: 'exception-list.created_at',
    sortOrder: 'desc',
  });

  if (exceptionLists.length === 0) {
    return null;
  }

  // Stream the results from the Point In Time (PIT) finder into this array
  const exceptionItems: ExceptionListItemSchema[] = [];
  const appendExceptionItem = (response: FoundExceptionListItemSchema): void => {
    exceptionItems.push(...response.data);
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

  await findExceptionListsItemsPointInTimeFinder({
    executeFunctionOnStream: appendExceptionItem,
    filter,
    listIds,
    maxSize: 10_000,
    namespaceTypes,
    perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
    savedObjectsClient,
    sortField: 'exception-list.created_at',
    sortOrder: 'desc',
  });

  const { exportData } = getExport([...exceptionLists, ...exceptionItems]);

  // TODO: Add logic for missing lists and items on errors
  return {
    exportData,
    exportDetails: {
      exported_exception_list_count: exceptionLists.length,
      exported_exception_list_item_count: exceptionItems.length,
      missing_exception_list_item_count: 0,
      missing_exception_list_items: [],
      missing_exception_lists: [],
      missing_exception_lists_count: 0,
    },
  };
};

export const getExport = (
  data: unknown[]
): {
  exportData: string;
} => {
  const ndjson = transformDataToNdjson(data);

  return { exportData: ndjson };
};
