/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import { resolveEndStageItems } from './resolve_end_stage_items';
import type { OutputColumns } from './types';

type Entry = EntriesArray[number];

const match = (
  field: string,
  value: string,
  columnType: string,
  operator: 'included' | 'excluded' = 'included'
): Entry => ({ field, operator, type: 'match', value, column_type: columnType } as Entry);

const itemOf = (id: string, entries: Entry[]) =>
  getExceptionListItemSchemaMock({ item_id: id, name: id, entries: entries as EntriesArray });

const columns = (entries: Array<[string, string]>): OutputColumns => new Map(entries);

describe('resolveEndStageItems', () => {
  it('writes an item whose columns the query outputs with the declared types', () => {
    const item = itemOf('a', [match('risk', 'low', 'keyword'), match('count', '3', 'long')]);

    const result = resolveEndStageItems({
      items: [item],
      outputColumns: columns([
        ['risk', 'keyword'],
        ['count', 'long'],
      ]),
    });

    expect(result.skippedItems).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.endStageItems).toEqual([
      {
        item,
        clause: 'NOT ((MV_CONTAINS(risk, "low")) AND (MV_CONTAINS(count, 3::long)))',
        terms: 2,
      },
    ]);
  });

  it('skips an item with an entry that has an inclusive operator on a column that the query does not output, because it never matches', () => {
    const item = itemOf('a', [match('risk', 'low', 'keyword'), match('ghost', 'x', 'keyword')]);

    const result = resolveEndStageItems({
      items: [item],
      outputColumns: columns([['risk', 'keyword']]),
    });

    expect(result.endStageItems).toEqual([]);
    expect(result.skippedItems).toEqual([
      {
        item,
        code: 'item_never_matches',
        explanation: '"ghost" is not in the output of the query',
        fields: ['ghost'],
      },
    ]);
  });

  it('names every column that the query does not output, once', () => {
    const item = itemOf('a', [
      match('x', '1', 'keyword'),
      match('y', '1', 'keyword'),
      match('x', '2', 'keyword'),
    ]);

    const { skippedItems } = resolveEndStageItems({ items: [item], outputColumns: columns([]) });

    expect(skippedItems).toEqual([expect.objectContaining({ fields: ['x', 'y'] })]);
  });

  it('leaves out an entry with an exclusive operator on a column that the query does not output, because it is true for every row', () => {
    const item = itemOf('a', [
      match('risk', 'low', 'keyword'),
      match('ghost', 'x', 'keyword', 'excluded'),
    ]);

    const result = resolveEndStageItems({
      items: [item],
      outputColumns: columns([['risk', 'keyword']]),
    });

    expect(result.skippedItems).toEqual([]);
    expect(result.endStageItems).toEqual([
      { item, clause: 'NOT (MV_CONTAINS(risk, "low"))', terms: 1 },
    ]);
  });

  it('excludes every row for an item whose entries all have an exclusive operator on columns that the query does not output, as the DSL filter does for a field that exists nowhere', () => {
    const item = itemOf('a', [match('ghost', 'x', 'keyword', 'excluded')]);

    const result = resolveEndStageItems({ items: [item], outputColumns: columns([]) });

    expect(result.skippedItems).toEqual([]);
    expect(result.endStageItems).toEqual([
      { item, clause: 'false', terms: 1, excludesEveryRow: true },
    ]);
  });

  it('does the same when there are several entries with an exclusive operator, and not when one of them has an inclusive operator', () => {
    const allExclusive = itemOf('a', [
      match('ghost', 'x', 'keyword', 'excluded'),
      match('other', 'y', 'keyword', 'excluded'),
    ]);
    const withInclusive = itemOf('b', [
      match('ghost', 'x', 'keyword', 'excluded'),
      match('other', 'y', 'keyword'),
    ]);

    const result = resolveEndStageItems({
      items: [allExclusive, withInclusive],
      outputColumns: columns([]),
    });

    expect(result.endStageItems.map(({ item, clause }) => [item.item_id, clause])).toEqual([
      ['a', 'false'],
    ]);
    expect(result.skippedItems.map(({ item, code }) => [item.item_id, code])).toEqual([
      ['b', 'item_never_matches'],
    ]);
  });

  it('still skips an item that has no entries at all, which the API does not accept', () => {
    const item = itemOf('a', []);

    const result = resolveEndStageItems({ items: [item], outputColumns: columns([]) });

    expect(result.endStageItems).toEqual([]);
    expect(result.skippedItems).toEqual([expect.objectContaining({ code: 'item_has_no_entries' })]);
  });

  it('treats a column of the type null as a column that the query does not output', () => {
    const item = itemOf('a', [match('risk', 'low', 'keyword')]);

    const result = resolveEndStageItems({
      items: [item],
      outputColumns: columns([['risk', 'null']]),
    });

    expect(result.skippedItems).toEqual([expect.objectContaining({ code: 'item_never_matches' })]);
    expect(result.typeMismatches).toEqual([]);
  });

  it('reports an entry that declares another type than the column has, and does not write the item', () => {
    const item = itemOf('a', [match('count', '3', 'keyword')]);

    const result = resolveEndStageItems({
      items: [item],
      outputColumns: columns([['count', 'long']]),
    });

    expect(result.endStageItems).toEqual([]);
    expect(result.skippedItems).toEqual([]);
    expect(result.typeMismatches).toEqual([
      { item, field: 'count', declaredType: 'keyword', actualType: 'long' },
    ]);
  });

  it('reports each entry with a mismatch', () => {
    const item = itemOf('a', [match('a', '10.0.0.1', 'ip'), match('b', '1', 'long')]);

    const { typeMismatches } = resolveEndStageItems({
      items: [item],
      outputColumns: columns([
        ['a', 'keyword'],
        ['b', 'integer'],
      ]),
    });

    expect(typeMismatches.map(({ field }) => field)).toEqual(['a', 'b']);
  });

  it('keeps writing the other items when one has a mismatch or is skipped', () => {
    const good = itemOf('good', [match('risk', 'low', 'keyword')]);
    const mismatched = itemOf('mismatched', [match('count', '3', 'keyword')]);
    const ghost = itemOf('ghost', [match('ghost', 'x', 'keyword')]);

    const result = resolveEndStageItems({
      items: [mismatched, good, ghost],
      outputColumns: columns([
        ['risk', 'keyword'],
        ['count', 'long'],
      ]),
    });

    expect(result.endStageItems.map(({ item }) => item.item_id)).toEqual(['good']);
    expect(result.skippedItems.map(({ item }) => item.item_id)).toEqual(['ghost']);
    expect(result.typeMismatches.map(({ item }) => item.item_id)).toEqual(['mismatched']);
  });

  it('checks the values of the entries that are left before their declared types', () => {
    const invalidOnAbsentColumn = itemOf('a', [match('ghost', 'bogus', 'ip')]);
    const invalidAndMismatched = itemOf('b', [
      match('count', '3', 'keyword'),
      match('addr', 'bogus', 'ip'),
    ]);

    const result = resolveEndStageItems({
      items: [invalidOnAbsentColumn, invalidAndMismatched],
      outputColumns: columns([
        ['count', 'long'],
        ['addr', 'ip'],
      ]),
    });

    expect(result.endStageItems).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    // the entry on the column that the query does not output is not checked: it makes the item skipped
    expect(result.skippedItems.map(({ item, code }) => [item.item_id, code])).toEqual([
      ['a', 'item_never_matches'],
      ['b', 'value_not_supported'],
    ]);
  });

  it('does not decide by the type of an entry that does not declare one: the compiler reports it', () => {
    const entry = { field: 'risk', operator: 'included', type: 'match', value: 'low' } as Entry;
    const item = itemOf('a', [entry]);

    const result = resolveEndStageItems({
      items: [item],
      outputColumns: columns([['risk', 'keyword']]),
    });

    expect(result.typeMismatches).toEqual([]);
    expect(result.skippedItems).toEqual([
      expect.objectContaining({ code: 'column_type_not_supported' }),
    ]);
  });
});
