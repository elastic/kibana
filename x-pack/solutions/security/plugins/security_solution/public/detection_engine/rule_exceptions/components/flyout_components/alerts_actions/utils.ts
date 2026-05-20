/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import type { Entry } from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type {
  EmptyEntry,
  EmptyListEntry,
  ExceptionsBuilderReturnExceptionItem,
} from '@kbn/securitysolution-list-utils';
import { getOperatorType } from '@kbn/securitysolution-list-utils';

/**
 * Determines if item entries has 'is in list'/'is not in list' entry
 */
export const entryHasListType = (exceptionItems: ExceptionsBuilderReturnExceptionItem[]) => {
  for (const { entries } of exceptionItems) {
    for (const exceptionEntry of entries ?? []) {
      if (getOperatorType(exceptionEntry) === ListOperatorTypeEnum.LIST) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Determines whether any entries within the given exceptionItems reference a
 * field that is not present on the supplied index patterns. The index patterns
 * are sourced from the same data view backing the exception field picker
 * (`useFetchIndexPatterns`), which surfaces both mapped fields and runtime
 * fields defined on the rule's source indices.
 */
export const entryHasNonEcsType = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[],
  indexPatterns: DataViewBase
): boolean => {
  const doesFieldNameExist = (exceptionEntry: Entry | EmptyListEntry | EmptyEntry): boolean => {
    return indexPatterns.fields.some(({ name }) => name === exceptionEntry.field);
  };

  if (exceptionItems.length === 0) {
    return false;
  }
  for (const { entries } of exceptionItems) {
    for (const exceptionEntry of entries ?? []) {
      if (exceptionEntry.type === 'nested') {
        for (const nestedExceptionEntry of exceptionEntry.entries) {
          if (doesFieldNameExist(nestedExceptionEntry) === false) {
            return true;
          }
        }
      } else if (doesFieldNameExist(exceptionEntry) === false) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Determines whether the bulk close alerts option should be disabled.
 */
export const shouldDisableBulkClose = ({
  items,
  indexPatterns,
}: {
  items: ExceptionsBuilderReturnExceptionItem[];
  indexPatterns: DataViewBase;
}): boolean => {
  return (
    entryHasListType(items) ||
    entryHasNonEcsType(items, indexPatterns) ||
    items.every((item) => item.entries.length === 0)
  );
};
