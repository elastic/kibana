/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import {
  MAX_END_STAGE_ITEMS,
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

describe('splitExceptionItems', () => {
  it('keeps an item on source fields in the DSL', () => {
    const source = item('source', [match('host.name', 'dc-01')]);
    expect(split([source])).toEqual({ dslItems: [source], endStageItems: [], skippedItems: [] });
  });

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

  it('keeps an item on a source field in the DSL even when the query outputs a column with that name', () => {
    expect(split([item('same-name', [match('user.name', 'svc')])]).dslItems).toHaveLength(1);
  });

  it('moves an item on a computed column to the end of the query', () => {
    const computed = item('computed', [match('risk', 'low')]);
    expect(split([computed])).toEqual({
      dslItems: [],
      endStageItems: [{ item: computed, clause: 'NOT (MV_CONTAINS(risk, "low"))' }],
      skippedItems: [],
    });
  });

  it('moves an item that mixes a source field and a computed column when the query outputs both', () => {
    const mixed = item('mixed', [match('user.name', 'svc'), match('risk', 'low')]);
    expect(split([mixed]).endStageItems).toEqual([
      {
        item: mixed,
        clause: 'NOT ((MV_CONTAINS(user.name, "svc")) AND (MV_CONTAINS(risk, "low")))',
      },
    ]);
  });

  it('skips, at debug level, an item whose field is nowhere', () => {
    const shared = item('shared', [match('process.name', 'ping')]);
    expect(split([shared])).toEqual({
      dslItems: [],
      endStageItems: [],
      skippedItems: [
        {
          item: shared,
          level: 'debug',
          reason: '"process.name" is not in the source indices or in the output of the query',
        },
      ],
    });
  });

  it('skips, with a warning, an item that needs a source field the query drops', () => {
    const dropped = item('dropped', [match('host.name', 'web-02'), match('risk', 'high')]);
    expect(split([dropped]).skippedItems).toEqual([
      {
        item: dropped,
        level: 'warn',
        reason:
          '"host.name" is a field of the source indices that the query does not output, so the item cannot be evaluated at the end of the query',
      },
    ]);
  });

  it('skips, with a warning, an item on a column that cannot be tested', () => {
    const geo = item('geo', [match('location', 'x')]);
    expect(split([geo]).skippedItems).toEqual([
      {
        item: geo,
        level: 'warn',
        reason:
          'column "location" has type "geo_point", which cannot be tested at the end of the query',
      },
    ]);
  });

  it('skips, with a warning, an item whose value does not fit the column', () => {
    const bad = item('bad', [match('event_count', 'many')]);
    expect(split([bad]).skippedItems).toEqual([
      { item: bad, level: 'warn', reason: 'value "many" is not a valid long' },
    ]);
  });

  it('skips, with a warning, a value list on a computed column', () => {
    const list = item('list', [
      { field: 'risk', operator: 'included', type: 'list', list: { id: 'l', type: 'keyword' } },
    ]);
    expect(split([list]).skippedItems).toEqual([
      {
        item: list,
        level: 'warn',
        reason: 'entries of type "list" are not supported at the end of the query',
      },
    ]);
  });

  it('applies at most MAX_END_STAGE_ITEMS items at the end of the query', () => {
    const items = Array.from({ length: MAX_END_STAGE_ITEMS + 2 }, (_, i) =>
      item(`item-${i}`, [match('risk', `v${i}`)])
    );
    const result = split(items);
    expect(result.endStageItems).toHaveLength(MAX_END_STAGE_ITEMS);
    expect(result.skippedItems.map(({ level, reason }) => ({ level, reason }))).toEqual([
      {
        level: 'warn',
        reason: `no more than ${MAX_END_STAGE_ITEMS} items are applied at the end of the query`,
      },
      {
        level: 'warn',
        reason: `no more than ${MAX_END_STAGE_ITEMS} items are applied at the end of the query`,
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
