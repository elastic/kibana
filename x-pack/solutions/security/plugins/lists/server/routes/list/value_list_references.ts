/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { ExceptionListClient } from '../../services/exception_lists/exception_list_client';
import type { ValueListReferencingRules, ValueListRuleScanner } from '../../types';

/** Exception lists that hold at least one item referencing the value list. */
export const findExceptionListIdsReferencing = async (
  exceptionLists: ExceptionListClient,
  valueListId: string
): Promise<string[]> => {
  const found = await exceptionLists.findValueListExceptionListItems({
    page: 1,
    perPage: 1000,
    pit: undefined,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
    valueListId,
  });
  return [...new Set((found?.data ?? []).map((item) => item.list_id))];
};

/**
 * Best effort scan for detection rules that reference a value list. `lists` resolves
 * the exception lists that reference the value list, since it owns exception lists;
 * the registered scanner turns those and the threat index names into rules, and when
 * `verifyReadOn` is set also checks each rule's API key for read on that index. A scan
 * failure yields `unverified` and never fails the caller.
 */
export const scanReferencingRules = async ({
  accessNames,
  exceptionLists,
  itemsIndex,
  listId,
  request,
  scanner,
  verifyReadOn,
}: {
  accessNames: string[];
  exceptionLists: ExceptionListClient;
  itemsIndex: string;
  listId: string;
  request: KibanaRequest;
  scanner: ValueListRuleScanner | undefined;
  verifyReadOn?: string;
}): Promise<ValueListReferencingRules> => {
  if (scanner == null) {
    return { level: 'none' };
  }
  try {
    const exceptionListIds = await findExceptionListIdsReferencing(exceptionLists, listId);
    return await scanner({
      accessNames,
      exceptionListIds,
      itemsIndex,
      listId,
      request,
      verifyReadOn,
    });
  } catch {
    return { level: 'unverified' };
  }
};
