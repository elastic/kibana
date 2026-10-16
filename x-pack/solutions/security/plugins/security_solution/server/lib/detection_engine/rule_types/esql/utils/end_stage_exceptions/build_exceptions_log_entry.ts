/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndStageItem, SkipReasonCode, SkippedItem } from './types';

/** An event log message is a document, so the list of items that are not applied is cut at this size. */
export const MAX_LOGGED_ITEMS = 200;

/** The query is cut at this length, which a rule with a very long query plus the appended stages can exceed. */
export const MAX_LOGGED_QUERY_LENGTH = 20000;

interface ItemReference {
  list_id: string;
  item_id: string;
}

/** The JSON text of the rule execution log message that lists the items applied at the end of the query and the items that were not applied. */
export interface ExceptionsLogEntry {
  type: 'esql_exceptions';
  version: 1;
  /** The query that the rule runs, with the stages of the items applied at the end of the query, and without the page size. */
  query: string;
  /** True when `query` was cut at the maximum length. */
  queryTruncated: boolean;
  /** Items that stay in the DSL filter, as they always did. */
  dslItemCount: number;
  appliedAtEndOfQuery: ItemReference[];
  notApplied: Array<
    ItemReference & {
      name: string;
      code: SkipReasonCode;
      reason: string;
      fields?: string[];
    }
  >;
  notAppliedCount: number;
  /** True when `notApplied` has fewer entries than `notAppliedCount`. */
  truncated: boolean;
}

export const buildExceptionsLogEntry = ({
  query,
  dslItemCount,
  endStageItems,
  skippedItems,
}: {
  query: string;
  dslItemCount: number;
  endStageItems: readonly EndStageItem[];
  skippedItems: readonly SkippedItem[];
}): ExceptionsLogEntry => ({
  type: 'esql_exceptions',
  version: 1,
  query: query.slice(0, MAX_LOGGED_QUERY_LENGTH),
  queryTruncated: query.length > MAX_LOGGED_QUERY_LENGTH,
  dslItemCount,
  appliedAtEndOfQuery: endStageItems.map(({ item }) => ({
    list_id: item.list_id,
    item_id: item.item_id,
  })),
  notApplied: skippedItems.slice(0, MAX_LOGGED_ITEMS).map(({ item, code, reason, fields }) => ({
    list_id: item.list_id,
    item_id: item.item_id,
    name: item.name,
    code,
    reason,
    ...(fields != null && fields.length > 0 ? { fields } : {}),
  })),
  notAppliedCount: skippedItems.length,
  truncated: skippedItems.length > MAX_LOGGED_ITEMS,
});
