/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Entry,
  EntryNested,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

const isEndpointExceptionList = (item: ExceptionListItemSchema): boolean =>
  item.list_id === ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id;

const escapeBackslashesForWildcardQuery = (value: string): string => value.replace(/\\/g, '\\\\');

const prepareEndpointExceptionEntryForBulkClose = (
  entry: Entry | EntryNested
): Entry | EntryNested => {
  if (entry.type === 'wildcard') {
    return {
      ...entry,
      value: escapeBackslashesForWildcardQuery(entry.value),
    };
  }

  return entry;
};

/**
 * Returns a copy of the given Endpoint exception items with backslashes
 * doubled in `wildcard` entry values so that the resulting Elasticsearch
 * `wildcard` query matches Windows-style paths literally instead of
 * interpreting `\` as an escape character. The persisted artifact is left
 * unchanged — this transform is only applied to the items used to build
 * the bulk close alerts query.
 */
export const prepareEndpointExceptionItemsForBulkClose = (
  exceptionItems: ExceptionListItemSchema[]
): ExceptionListItemSchema[] => {
  return exceptionItems.map((item: ExceptionListItemSchema) => {
    if (!isEndpointExceptionList(item) || item.entries === undefined) {
      return item;
    }

    return {
      ...item,
      entries: item.entries.map(prepareEndpointExceptionEntryForBulkClose),
    };
  });
};
