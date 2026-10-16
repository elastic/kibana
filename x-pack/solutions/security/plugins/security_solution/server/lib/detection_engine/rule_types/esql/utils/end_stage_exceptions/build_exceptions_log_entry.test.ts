/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import {
  MAX_LOGGED_ITEMS,
  MAX_LOGGED_QUERY_LENGTH,
  buildExceptionsLogEntry,
} from './build_exceptions_log_entry';
import type { SkippedItem } from './types';

const item = (id: string) => getExceptionListItemSchemaMock({ item_id: id, name: `name ${id}` });

const skipped = (id: string): SkippedItem => ({
  item: item(id),
  code: 'value_not_supported',
  reason: 'value "x" cannot be written for a column of type long at the end of the query',
  fields: ['count'],
});

describe('buildExceptionsLogEntry', () => {
  it('describes the final query, the items applied at the end of the query and the items that are not applied', () => {
    const entry = buildExceptionsLogEntry({
      query: 'FROM a | WHERE NOT (x IS NOT NULL)',
      dslItemCount: 3,
      endStageItems: [{ item: item('applied'), clause: 'NOT (x IS NOT NULL)', terms: 1 }],
      skippedItems: [skipped('skipped')],
    });

    expect(entry).toEqual({
      type: 'esql_exceptions',
      version: 1,
      query: 'FROM a | WHERE NOT (x IS NOT NULL)',
      queryTruncated: false,
      dslItemCount: 3,
      appliedAtEndOfQuery: [{ list_id: 'endpoint_list_id', item_id: 'applied' }],
      notApplied: [
        {
          list_id: 'endpoint_list_id',
          item_id: 'skipped',
          name: 'name skipped',
          code: 'value_not_supported',
          reason: 'value "x" cannot be written for a column of type long at the end of the query',
          fields: ['count'],
        },
      ],
      notAppliedCount: 1,
      truncated: false,
    });
  });

  it('leaves out the fields when none is known', () => {
    const { notApplied } = buildExceptionsLogEntry({
      query: 'FROM a',
      dslItemCount: 0,
      endStageItems: [],
      skippedItems: [{ item: item('a'), code: 'item_has_no_entries', reason: 'too many' }],
    });

    expect(notApplied[0]).not.toHaveProperty('fields');
  });

  it('cuts the list of items that are not applied and says so', () => {
    const entry = buildExceptionsLogEntry({
      query: 'FROM a',
      dslItemCount: 0,
      endStageItems: [],
      skippedItems: Array.from({ length: MAX_LOGGED_ITEMS + 5 }, (_, i) => skipped(`s${i}`)),
    });

    expect(entry.notApplied).toHaveLength(MAX_LOGGED_ITEMS);
    expect(entry.notAppliedCount).toBe(MAX_LOGGED_ITEMS + 5);
    expect(entry.truncated).toBe(true);
  });

  it('cuts a query that is too long and says so', () => {
    const entry = buildExceptionsLogEntry({
      query: 'x'.repeat(MAX_LOGGED_QUERY_LENGTH + 1),
      dslItemCount: 0,
      endStageItems: [],
      skippedItems: [],
    });

    expect(entry.query).toHaveLength(MAX_LOGGED_QUERY_LENGTH);
    expect(entry.queryTruncated).toBe(true);
  });
});
