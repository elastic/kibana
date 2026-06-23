/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
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

interface BulkExportExceptionDetails {
  exported_exception_list_count: number;
  exported_exception_list_item_count: number;
}

export interface ExportExceptionListsAndItemsReturn {
  exportData: string;
  exportDetails: BulkExportExceptionDetails;
}

/**
 * Maximum number of saved objects (lists + items combined) that a single bulk
 * export request will return. Requests that would exceed this limit fail with
 * a 422 rather than silently truncating the export.
 */
export const EXPORT_SIZE_LIMIT = 10_000;

/**
 * Thrown when a bulk export request would return more saved objects than
 * {@link EXPORT_SIZE_LIMIT}. Carries a `statusCode` of 422 so the route layer
 * surfaces it as Unprocessable Entity via `transformError`.
 */
export class ExportSizeLimitError extends Error {
  public readonly statusCode = 422;

  constructor(message: string) {
    super(message);
    this.name = 'ExportSizeLimitError';
  }
}

export const exportExceptionListsAndItems = async ({
  namespaceType,
  includeExpiredExceptions,
  savedObjectsClient,
  filter: dataFilter,
}: ExportExceptionListsAndItemsOptions): Promise<ExportExceptionListsAndItemsReturn> => {
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

  const savedObjectPrefix = getSavedObjectType({ namespaceType });
  // Bulk export only emits shared detection exception lists. `endpoint*` lists belong
  // to dedicated Defend workflows, and `rule_default` lists are scoped to a single
  // rule and are exported alongside that rule rather than on their own.
  const detectionListsFilter = `${savedObjectPrefix}.attributes.type: detection`;
  const listFilter = dataFilter
    ? `(${dataFilter}) AND ${detectionListsFilter}`
    : detectionListsFilter;

  // Fetch one extra so we can distinguish "exactly at the limit" from "over".
  await findExceptionListPointInTimeFinder({
    executeFunctionOnStream: appendExceptionList,
    filter: listFilter,
    maxSize: EXPORT_SIZE_LIMIT + 1,
    namespaceType: [namespaceType],
    perPage: 1_000,
    savedObjectsClient,
    sortField: `${savedObjectPrefix}.created_at`,
    sortOrder: 'desc',
  });

  if (exceptionLists.length === 0) {
    // Bulk export is a "give me everything matching" operation, so an empty
    // result set is a valid 200 response (mirroring the rules export) rather
    // than a 404. The summary footer reports zero counts.
    return {
      exportData: '',
      exportDetails: {
        exported_exception_list_count: 0,
        exported_exception_list_item_count: 0,
      },
    };
  }

  if (exceptionLists.length > EXPORT_SIZE_LIMIT) {
    throw new ExportSizeLimitError(
      `Cannot export more than ${EXPORT_SIZE_LIMIT} exception lists in a single request`
    );
  }

  const exceptionItems: ExceptionListItemSchema[] = [];
  const appendExceptionItem = (response: FoundExceptionListItemSchema): void => {
    exceptionItems.push(...response.data);
  };

  // The user-supplied `dataFilter` selects which lists to export; it is applied
  // to the lists query only. Items are retrieved by their parent list_ids (see
  // `listIds` below), so threading the list filter into the items query would
  // incorrectly drop items whose attributes don't match a list-shaped filter
  // (e.g. `exception-list.attributes.name: "..."`). The only constraint we add
  // to the items query is the optional expired-exceptions clause.
  let filter: string | undefined;

  if (!includeExpiredExceptions) {
    filter = `(${savedObjectPrefix}.attributes.expire_time > "${new Date().toISOString()}" OR NOT ${savedObjectPrefix}.attributes.expire_time: *)`;
  }

  // Cap items at the remaining budget, again with +1 so we can detect overflow.
  const itemsBudget = EXPORT_SIZE_LIMIT - exceptionLists.length;
  await findExceptionListsItemsPointInTimeFinder({
    executeFunctionOnStream: appendExceptionItem,
    filter,
    listIds,
    maxSize: itemsBudget + 1,
    namespaceTypes,
    perPage: 1_000, // See https://github.com/elastic/kibana/issues/93770 for choice of 1k
    savedObjectsClient,
    sortField: `${savedObjectPrefix}.created_at`,
    sortOrder: 'desc',
  });

  if (exceptionLists.length + exceptionItems.length > EXPORT_SIZE_LIMIT) {
    throw new ExportSizeLimitError(
      `Cannot export more than ${EXPORT_SIZE_LIMIT} exception lists and items in a single request`
    );
  }

  const { exportData } = getExport([...exceptionLists, ...exceptionItems]);

  return {
    exportData,
    exportDetails: {
      exported_exception_list_count: exceptionLists.length,
      exported_exception_list_item_count: exceptionItems.length,
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
