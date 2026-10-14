/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import {
  getFieldsToInspect,
  isFlattenedSourceField,
  needsOutputColumns,
  splitExceptionItems,
} from './split_exception_items';

type Entry = EntriesArray[number];

const match = (field: string, value: string): Entry => ({
  field,
  operator: 'included',
  type: 'match',
  value,
});

const item = (id: string, entries: Entry[]): ExceptionListItemSchema =>
  getExceptionListItemSchemaMock({
    item_id: id,
    name: id,
    entries: entries as EntriesArray,
  });

// The rule query: FROM logs | STATS event_count = COUNT(*) BY user.name | EVAL risk = CASE(...)
const sourceFieldTypes = new Map<string, string[]>([
  ['host', ['object']],
  ['host.name', ['keyword']],
  ['user.name', ['keyword']],
  ['labels', ['flattened']],
  ['nested_user', ['nested']],
  ['nested_user.name', ['keyword']],
]);
const outputColumns = new Map<string, string>([
  ['event_count', 'long'],
  ['user.name', 'keyword'],
  ['risk', 'keyword'],
  ['location', 'geo_point'],
]);

const split = (items: ExceptionListItemSchema[]) =>
  splitExceptionItems({ items, sourceFieldTypes, outputColumns });

describe('isFlattenedSourceField', () => {
  it('finds a key below a flattened field, which _field_caps does not list', () => {
    expect(isFlattenedSourceField('labels.domain', sourceFieldTypes)).toBe(true);
    expect(isFlattenedSourceField('labels.a.b', sourceFieldTypes)).toBe(true);
  });

  it('does not treat a mapped field or an object parent as a flattened key', () => {
    expect(isFlattenedSourceField('host.name', sourceFieldTypes)).toBe(false);
    expect(isFlattenedSourceField('host', sourceFieldTypes)).toBe(false);
  });

  it('does not treat a key below another kind of field as a flattened key', () => {
    expect(isFlattenedSourceField('host.name.extra', sourceFieldTypes)).toBe(false);
    expect(isFlattenedSourceField('risk', sourceFieldTypes)).toBe(false);
  });
});

describe('getFieldsToInspect', () => {
  it('lists every field once, with its parent paths', () => {
    expect(
      getFieldsToInspect([
        item('a', [match('labels.domain', 'x'), match('risk', 'low')]),
        item('b', [match('labels.domain', 'y')]),
      ]).sort()
    ).toEqual(['labels', 'labels.domain', 'risk']);
  });
});

describe('needsOutputColumns', () => {
  it('is false when every field is a source field', () => {
    expect(needsOutputColumns([item('a', [match('host.name', 'x')])], sourceFieldTypes)).toBe(
      false
    );
  });

  it('is true when a field is not a source field', () => {
    expect(needsOutputColumns([item('a', [match('risk', 'x')])], sourceFieldTypes)).toBe(true);
  });
});

describe('a source field that the query also outputs', () => {
  const outputWithHost = new Map(outputColumns).set('host.name', 'keyword');
  const hostItem = item('host', [match('host.name', 'dc-01')]);

  it.each([
    ['a column of the same type', outputWithHost],
    ['a column of another type', new Map(outputColumns).set('host.name', 'long')],
    ['no column', outputColumns],
  ])('stays in the DSL filter only, with %s', (_, columns) => {
    const result = splitExceptionItems({
      items: [hostItem],
      sourceFieldTypes,
      outputColumns: columns,
    });
    expect(result.dslItems).toEqual([hostItem]);
    expect(result.endStageItems).toEqual([]);
    expect(result.skippedItems).toEqual([]);
  });

  it('is applied at the end of the query when the item also names a computed column', () => {
    const mixed = item('mixed', [match('host.name', 'dc-01'), match('risk', 'low')]);
    const result = splitExceptionItems({
      items: [mixed],
      sourceFieldTypes,
      outputColumns: outputWithHost,
    });
    expect(result.dslItems).toEqual([]);
    expect(result.endStageItems.map(({ item: { item_id: id } }) => id)).toEqual(['mixed']);
  });
});

describe('splitExceptionItems', () => {
  it('keeps items on a flattened key and on a nested field in the DSL', () => {
    const flattened = item('flattened', [match('labels.domain', 'a')]);
    const nested: Entry = {
      field: 'nested_user',
      type: 'nested',
      entries: [{ field: 'name', operator: 'included', type: 'match', value: 'svc' }],
    };
    const nestedItem = item('nested', [nested]);
    expect(split([flattened, nestedItem]).dslItems).toEqual([flattened, nestedItem]);
  });

  it('moves an item on a computed column to the end of the query', () => {
    const computed = item('computed', [match('risk', 'low')]);
    expect(split([computed])).toEqual({
      dslItems: [],
      endStageItems: [{ item: computed, clause: 'NOT (MV_CONTAINS(risk, "low"))', terms: 1 }],
      skippedItems: [],
    });
  });

  it('moves an item that mixes a source field and a computed column when the query outputs both', () => {
    const mixed = item('mixed', [match('user.name', 'svc'), match('risk', 'low')]);
    expect(split([mixed]).endStageItems).toEqual([
      {
        item: mixed,
        clause: 'NOT ((MV_CONTAINS(user.name, "svc")) AND (MV_CONTAINS(risk, "low")))',
        terms: 2,
      },
    ]);
  });

  it('skips an item whose field is nowhere', () => {
    const shared = item('shared', [match('process.name', 'ping')]);
    expect(split([shared])).toEqual({
      dslItems: [],
      endStageItems: [],
      skippedItems: [
        {
          item: shared,
          code: 'field_not_found',
          reason: '"process.name" is not in the source indices or in the output of the query',
          fields: ['process.name'],
        },
      ],
    });
  });

  it('skips an item that needs a source field the query does not output', () => {
    const dropped = item('dropped', [match('host.name', 'web-02'), match('risk', 'high')]);
    expect(split([dropped]).skippedItems).toEqual([
      {
        item: dropped,
        code: 'source_field_not_output',
        reason: '"host.name" is a field of the source indices that the query does not output',
        fields: ['host.name'],
      },
    ]);
  });

  it('names both reasons when an item has a field that is nowhere and one that the query drops', () => {
    const both = item('both', [match('host.name', 'web-02'), match('process.name', 'ping')]);
    expect(split([both]).skippedItems).toEqual([
      {
        item: both,
        code: 'field_not_found',
        reason:
          '"process.name" is not in the source indices or in the output of the query; "host.name" is a field of the source indices that the query does not output',
        fields: ['process.name', 'host.name'],
      },
    ]);
  });

  it('skips an item on a column that cannot be tested', () => {
    const geo = item('geo', [match('location', 'x')]);
    expect(split([geo]).skippedItems).toEqual([
      {
        item: geo,
        code: 'column_type_not_supported',
        reason:
          'column "location" has type "geo_point", which cannot be tested at the end of the query',
        fields: ['location'],
      },
    ]);
  });

  it('skips an item whose value does not fit the column', () => {
    const bad = item('bad', [match('event_count', 'many')]);
    expect(split([bad]).skippedItems).toEqual([
      {
        item: bad,
        code: 'value_not_valid',
        reason: 'value "many" is not a valid long',
        fields: ['event_count'],
      },
    ]);
  });

  it('skips a value list on a computed column', () => {
    const list = item('list', [
      { field: 'risk', operator: 'included', type: 'list', list: { id: 'l', type: 'keyword' } },
    ]);
    expect(split([list]).skippedItems).toEqual([
      {
        item: list,
        code: 'entry_type_not_supported',
        reason: 'entries of type "list" are not supported at the end of the query',
        fields: ['risk'],
      },
    ]);
  });

  it('places every item of a mixed list', () => {
    const source = item('source', [match('host.name', 'dc-01')]);
    const computed = item('computed', [match('risk', 'low')]);
    const shared = item('shared', [match('process.name', 'ping')]);
    const result = split([source, computed, shared]);
    expect(result.dslItems).toEqual([source]);
    expect(result.endStageItems.map(({ item: { item_id: id } }) => id)).toEqual(['computed']);
    expect(result.skippedItems.map(({ item: { item_id: id } }) => id)).toEqual(['shared']);
  });
});
