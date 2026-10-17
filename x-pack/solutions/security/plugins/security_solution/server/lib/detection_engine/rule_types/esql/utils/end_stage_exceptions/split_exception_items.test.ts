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

  // _field_caps lists a nested path only when a field below it is requested too
  it('also lists the paths below a nested entry, so that the nested path is listed by _field_caps', () => {
    const nested: Entry = {
      field: 'nested_user',
      type: 'nested',
      entries: [
        { field: 'name', operator: 'included', type: 'match', value: 'svc' },
        { field: 'address.city', operator: 'included', type: 'exists' },
      ],
    };
    expect(getFieldsToInspect([item('nested', [nested])]).sort()).toEqual([
      'nested_user',
      'nested_user.address',
      'nested_user.address.city',
      'nested_user.name',
    ]);
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

describe('a column named like a nested path', () => {
  // FROM logs | EVAL nested_user = "x" | STATS event_count = COUNT(*) BY nested_user
  const nested: Entry = {
    field: 'nested_user',
    type: 'nested',
    entries: [{ field: 'name', operator: 'included', type: 'match', value: 'svc' }],
  };
  const nestedItem = item('nested', [nested]);
  const withNestedColumn = new Map(outputColumns).set('nested_user', 'keyword');

  it('stays in the DSL filter, because the nested path is a field of the source indices that the DSL searches', () => {
    const result = splitExceptionItems({
      items: [nestedItem],
      sourceFieldTypes,
      outputColumns: withNestedColumn,
    });
    expect(result.dslItems).toEqual([nestedItem]);
    expect(result.endStageItems).toEqual([]);
    expect(result.skippedItems).toEqual([]);
  });

  it('is not applied at the end of the query when the item also has a computed column', () => {
    const mixed = item('mixed', [nested, match('risk', 'low')]);
    const result = splitExceptionItems({
      items: [mixed],
      sourceFieldTypes,
      outputColumns: withNestedColumn,
    });
    expect(result.dslItems).toEqual([]);
    expect(result.skippedItems.map(({ code }) => code)).toEqual(['entry_type_not_supported']);
  });
});

describe('a column named like an object parent', () => {
  // FROM logs | STATS event_count = COUNT(*) BY host = host.name
  const withHostColumn = new Map(outputColumns).set('host', 'keyword');
  const hostItem = item('host', [match('host', 'web-1')]);
  const hostNameItem = item('host_name', [match('host.name', 'db-9')]);

  it('is applied at the end of the query, because an object is not a field that the DSL can search', () => {
    const result = splitExceptionItems({
      items: [hostItem],
      sourceFieldTypes,
      outputColumns: withHostColumn,
    });
    expect(result.dslItems).toEqual([]);
    expect(result.endStageItems.map(({ item: { item_id: id } }) => id)).toEqual(['host']);
    expect(result.skippedItems).toEqual([]);
  });

  it('is placed in the same way whether or not another item names a field below the object', () => {
    // _field_caps lists `host` as an object only when `host.name` is requested too, so that it can look for flattened parents
    const alone = splitExceptionItems({
      items: [hostItem],
      sourceFieldTypes: new Map([['user.name', ['keyword']]]),
      outputColumns: withHostColumn,
    });
    const together = splitExceptionItems({
      items: [hostItem, hostNameItem],
      sourceFieldTypes,
      outputColumns: withHostColumn,
    });
    expect(alone.endStageItems.map(({ item: { item_id: id } }) => id)).toEqual(['host']);
    expect(together.endStageItems.map(({ item: { item_id: id } }) => id)).toEqual(['host']);
    expect(together.dslItems).toEqual([hostNameItem]);
  });

  it('needs the output columns of the query', () => {
    expect(needsOutputColumns([hostItem], sourceFieldTypes)).toBe(true);
  });

  it('stays in the DSL filter when the query has no column with that name, because the name exists nowhere', () => {
    const result = splitExceptionItems({ items: [hostItem], sourceFieldTypes, outputColumns });
    expect(result.dslItems).toEqual([hostItem]);
    expect(result.skippedItems).toEqual([]);
  });

  it('stays in the DSL filter when the same name is a field with values in another index', () => {
    const result = splitExceptionItems({
      items: [hostItem],
      sourceFieldTypes: new Map([['host', ['object', 'keyword']]]),
      outputColumns: withHostColumn,
    });
    expect(result.dslItems).toEqual([hostItem]);
    expect(result.endStageItems).toEqual([]);
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

  it('keeps in the DSL an item whose fields exist nowhere, so that the DSL decides as it always did', () => {
    const shared = item('shared', [match('process.name', 'ping')]);
    expect(split([shared])).toEqual({ dslItems: [shared], endStageItems: [], skippedItems: [] });
  });

  // `process.name is not ping AND host.name is web-1` on an index without process.name excludes the web-1 events in the DSL
  // (a negative operator on a field that no document has matches every document), and users rely on it
  it.each([
    ['is not', { field: 'process.name', operator: 'excluded', type: 'match', value: 'ping' }],
    [
      'is not one of',
      { field: 'process.name', operator: 'excluded', type: 'match_any', value: ['ping', 'nc'] },
    ],
    ['does not exist', { field: 'process.name', operator: 'excluded', type: 'exists' }],
    [
      'does not match',
      { field: 'process.name', operator: 'excluded', type: 'wildcard', value: 'pin*' },
    ],
  ] as Array<[string, Entry]>)(
    'keeps in the DSL an item with "%s" on a field that exists nowhere, so that it keeps matching every document',
    (_, negative) => {
      const negativeItem = item('negative', [negative, match('host.name', 'web-1')]);
      expect(split([negativeItem])).toEqual({
        dslItems: [negativeItem],
        endStageItems: [],
        skippedItems: [],
      });
    }
  );

  // `risk is low AND process.name is not ping` on an index without process.name: no row has the field, so the second entry is
  // true for every row, as in the DSL, and the item reduces to `risk is low`
  it.each([
    ['is not', { field: 'process.name', operator: 'excluded', type: 'match', value: 'ping' }],
    [
      'is not one of',
      { field: 'process.name', operator: 'excluded', type: 'match_any', value: ['ping', 'nc'] },
    ],
    ['does not exist', { field: 'process.name', operator: 'excluded', type: 'exists' }],
    [
      'does not match',
      { field: 'process.name', operator: 'excluded', type: 'wildcard', value: 'pin*' },
    ],
  ] as Array<[string, Entry]>)(
    'applies at the end of the query an item with a computed column and "%s" on a field that exists nowhere, without that entry',
    (_, negative) => {
      const reduced = item('reduced', [match('risk', 'low'), negative]);
      expect(split([reduced])).toEqual({
        dslItems: [],
        endStageItems: [{ item: reduced, clause: 'NOT (MV_CONTAINS(risk, "low"))', terms: 1 }],
        skippedItems: [],
      });
    }
  );

  it('skips an item with a negative entry on a field that exists nowhere when another entry on a field that exists nowhere is not negative', () => {
    const entries: Entry[] = [
      match('risk', 'low'),
      { field: 'process.name', operator: 'excluded', type: 'match', value: 'ping' },
      match('user.id', 'u1'),
    ];
    const ghost = item('ghost', entries);
    expect(split([ghost]).skippedItems).toEqual([
      {
        item: ghost,
        code: 'field_not_found',
        reason: '"user.id" is not in the source indices or in the output of the query',
        fields: ['user.id'],
      },
    ]);
  });

  // The DSL fails the query for a nested entry on a path that is not mapped (`[nested] failed to find nested object under
  // path`), with either operator, so the rule fails today and the DSL decides for an item that has no computed column.
  it('keeps in the DSL an item that has only a nested entry on a path that exists nowhere, so that the DSL decides', () => {
    const ghostNested = item('ghost_nested', [
      {
        field: 'ghost_nested',
        type: 'nested',
        entries: [{ field: 'name', operator: 'included', type: 'match', value: 'svc' }],
      },
    ]);
    expect(split([ghostNested])).toEqual({
      dslItems: [ghostNested],
      endStageItems: [],
      skippedItems: [],
    });
  });

  it('skips an item that has a computed column and a nested entry on a path that exists nowhere', () => {
    const ghostNested = item('ghost_nested', [
      match('risk', 'low'),
      {
        field: 'ghost_nested',
        type: 'nested',
        entries: [{ field: 'name', operator: 'excluded', type: 'match', value: 'svc' }],
      },
    ]);
    expect(split([ghostNested]).skippedItems).toEqual([
      {
        item: ghostNested,
        code: 'field_not_found',
        reason: '"ghost_nested" is not in the source indices or in the output of the query',
        fields: ['ghost_nested'],
      },
    ]);
  });

  it('keeps in the DSL an item that has a field that exists nowhere and a source field, even one that the query drops', () => {
    const mixed = item('mixed', [match('process.name', 'ping'), match('host.name', 'web-02')]);
    expect(split([mixed])).toEqual({ dslItems: [mixed], endStageItems: [], skippedItems: [] });
  });

  it('skips an item that has a computed column and an entry on a field that exists nowhere that is not negative, because the entry never matches', () => {
    const ghost = item('ghost', [match('risk', 'low'), match('process.name', 'ping')]);
    expect(split([ghost])).toEqual({
      dslItems: [],
      endStageItems: [],
      skippedItems: [
        {
          item: ghost,
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

  it('names both reasons when an item has a computed column, a field that is nowhere and one that the query drops', () => {
    const both = item('both', [
      match('host.name', 'web-02'),
      match('process.name', 'ping'),
      match('risk', 'high'),
    ]);
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
        code: 'value_not_supported',
        reason: 'value "many" cannot be written for a column of type long at the end of the query',
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
    const ghost = item('ghost', [match('risk', 'low'), match('process.name', 'ping')]);
    const result = split([source, computed, shared, ghost]);
    expect(result.dslItems).toEqual([source, shared]);
    expect(result.endStageItems.map(({ item: { item_id: id } }) => id)).toEqual(['computed']);
    expect(result.skippedItems.map(({ item: { item_id: id } }) => id)).toEqual(['ghost']);
  });
});
