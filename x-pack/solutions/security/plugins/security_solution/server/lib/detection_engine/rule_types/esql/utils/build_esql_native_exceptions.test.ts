/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import type { PositionSchema } from './build_esql_native_exceptions';
import { buildNativeEsqlExceptionQuery, getFromClause } from './build_esql_native_exceptions';

type Entry = EntriesArray[number];

// Typed builders for each exception entry shape.
const match = (field: string, operator: 'included' | 'excluded', value: string): Entry => ({
  field,
  operator,
  type: 'match',
  value,
});
const matchAny = (field: string, operator: 'included' | 'excluded', value: string[]): Entry => ({
  field,
  operator,
  type: 'match_any',
  value,
});
const exists = (field: string, operator: 'included' | 'excluded'): Entry => ({
  field,
  operator,
  type: 'exists',
});
const wildcard = (field: string, operator: 'included' | 'excluded', value: string): Entry => ({
  field,
  operator,
  type: 'wildcard',
  value,
});
const nested = (field: string): Entry => ({
  field,
  type: 'nested',
  entries: [{ field: 'inner', operator: 'included', type: 'match', value: 'x' }],
});
const list = (field: string, operator: 'included' | 'excluded'): Entry => ({
  field,
  operator,
  type: 'list',
  list: { id: 'my-value-list', type: 'keyword' },
});

const itemWith = (entries: Entry[], itemId = 'item-1'): ExceptionListItemSchema =>
  getExceptionListItemSchemaMock({ item_id: itemId, entries: entries as EntriesArray });

const schema = (columnTypes: Record<string, string | undefined>): PositionSchema => ({
  columns: new Set(Object.keys(columnTypes)),
  columnTypes,
});

const EMPTY: PositionSchema = { columns: new Set(), columnTypes: {} };

// A rule query with a WHERE stage; the early exclusion lands right after FROM.
const INPUT = 'FROM logs-* METADATA _id | WHERE event.category == "process"';
// A rule query that aggregates; `count` exists only in the output.
const AGG_INPUT =
  'FROM logs-* METADATA _id | STATS count = COUNT(*) BY user.name | WHERE count > 5';

interface MatrixCase {
  name: string;
  field: string;
  columnType: string | undefined;
  entries: Entry[];
  /** Full query when the field is in the source indices (inlined early after FROM). */
  expected: string;
}

// Every entry type and operator on a source field, across the data types whose literal
// formatting differs. Source-field items are inlined early, right after FROM.
const MATRIX: MatrixCase[] = [
  {
    name: 'match / included / keyword',
    field: 'host.name',
    columnType: 'keyword',
    entries: [match('host.name', 'included', 'evil.com')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(host.name, "evil.com")) | WHERE event.category == "process"',
  },
  {
    name: 'match / excluded / keyword',
    field: 'host.name',
    columnType: 'keyword',
    entries: [match('host.name', 'excluded', 'evil.com')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (NOT MV_CONTAINS(host.name, "evil.com")) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / long (cast)',
    field: 'bytes',
    columnType: 'long',
    entries: [match('bytes', 'included', '42')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(bytes, 42::long)) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / double (cast)',
    field: 'score',
    columnType: 'double',
    entries: [match('score', 'included', '3.14')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(score, 3.14::double)) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / boolean',
    field: 'is_bad',
    columnType: 'boolean',
    entries: [match('is_bad', 'included', 'true')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(is_bad, true)) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / unsigned_long (cast)',
    field: 'big',
    columnType: 'unsigned_long',
    entries: [match('big', 'included', '1000')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(big, 1000::unsigned_long)) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / ip (cast)',
    field: 'source.ip',
    columnType: 'ip',
    entries: [match('source.ip', 'included', '10.0.0.1')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(source.ip, "10.0.0.1"::ip)) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / date (cast)',
    field: 'event.ts',
    columnType: 'date',
    entries: [match('event.ts', 'included', '2025-01-01T00:00:00.000Z')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(event.ts, "2025-01-01T00:00:00.000Z"::date)) | WHERE event.category == "process"',
  },
  {
    name: 'match / included / value with quotes and backslashes (escaped)',
    field: 'message',
    columnType: 'keyword',
    entries: [match('message', 'included', 'a"b\\c')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(message, "a\\"b\\\\c")) | WHERE event.category == "process"',
  },
  {
    name: 'match_any / included / keyword',
    field: 'process.name',
    columnType: 'keyword',
    entries: [matchAny('process.name', 'included', ['ping', 'curl'])],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT ((MV_CONTAINS(process.name, "ping") OR MV_CONTAINS(process.name, "curl"))) | WHERE event.category == "process"',
  },
  {
    name: 'match_any / excluded / keyword',
    field: 'process.name',
    columnType: 'keyword',
    entries: [matchAny('process.name', 'excluded', ['ping', 'curl'])],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (NOT (MV_CONTAINS(process.name, "ping") OR MV_CONTAINS(process.name, "curl"))) | WHERE event.category == "process"',
  },
  {
    name: 'match_any / included / long (cast)',
    field: 'port',
    columnType: 'long',
    entries: [matchAny('port', 'included', ['80', '443'])],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT ((MV_CONTAINS(port, 80::long) OR MV_CONTAINS(port, 443::long))) | WHERE event.category == "process"',
  },
  {
    name: 'exists / included',
    field: 'error.code',
    columnType: 'long',
    entries: [exists('error.code', 'included')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (error.code IS NOT NULL) | WHERE event.category == "process"',
  },
  {
    name: 'exists / excluded',
    field: 'error.code',
    columnType: 'long',
    entries: [exists('error.code', 'excluded')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (error.code IS NULL) | WHERE event.category == "process"',
  },
  {
    name: 'wildcard / included (QSTR, early)',
    field: 'url.original',
    columnType: 'keyword',
    entries: [wildcard('url.original', 'included', 'http*')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (QSTR("url.original:http*")) | WHERE event.category == "process"',
  },
  {
    name: 'wildcard / excluded (QSTR, early)',
    field: 'url.original',
    columnType: 'keyword',
    entries: [wildcard('url.original', 'excluded', 'http*')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (NOT QSTR("url.original:http*")) | WHERE event.category == "process"',
  },
  {
    name: 'wildcard / included with query-string special chars (escaped, early)',
    field: 'url.original',
    columnType: 'keyword',
    entries: [wildcard('url.original', 'included', 'a b:c*')],
    expected:
      'FROM logs-* METADATA _id\n| WHERE NOT (QSTR("url.original:a\\\\ b\\\\:c*")) | WHERE event.category == "process"',
  },
];

describe('buildNativeEsqlExceptionQuery', () => {
  describe('source-field items are inlined early (after FROM), across entry types and operators', () => {
    for (const testCase of MATRIX) {
      it(`${testCase.name}: inlined early when the field is in the source`, () => {
        const { query, skipped } = buildNativeEsqlExceptionQuery({
          query: INPUT,
          items: [itemWith(testCase.entries)],
          source: schema({ [testCase.field]: testCase.columnType }),
          output: EMPTY,
        });

        expect(skipped).toEqual([]);
        expect(query).toBe(testCase.expected);
      });

      it(`${testCase.name}: skipped when the field is in neither source nor output`, () => {
        const { query, skipped } = buildNativeEsqlExceptionQuery({
          query: INPUT,
          items: [itemWith(testCase.entries)],
          source: EMPTY,
          output: EMPTY,
        });

        expect(query).toBe(INPUT);
        expect(skipped).toEqual([
          {
            itemId: 'item-1',
            reason: `field "${testCase.field}" is not in the source index or the query output`,
          },
        ]);
      });
    }
  });

  describe('computed-column items are appended late (after the pipeline)', () => {
    it('match on a computed column uses MV_CONTAINS at the end', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: AGG_INPUT,
        items: [itemWith([match('count', 'included', '6')])],
        source: schema({ 'user.name': 'keyword' }),
        output: schema({ count: 'long', 'user.name': 'keyword' }),
      });

      expect(skipped).toEqual([]);
      expect(query).toBe(
        'FROM logs-* METADATA _id | STATS count = COUNT(*) BY user.name | WHERE count > 5\n| WHERE NOT (MV_CONTAINS(count, 6::long))'
      );
    });

    it('wildcard on a computed column falls back to LIKE at the end (QSTR cannot follow STATS)', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: AGG_INPUT,
        items: [itemWith([wildcard('category', 'included', 'ph*')])],
        source: schema({ 'user.name': 'keyword' }),
        output: schema({ category: 'keyword', count: 'long' }),
      });

      expect(skipped).toEqual([]);
      expect(query).toBe(
        'FROM logs-* METADATA _id | STATS count = COUNT(*) BY user.name | WHERE count > 5\n| WHERE NOT (COALESCE(category LIKE "ph*", false))'
      );
    });
  });

  describe('placement decisions', () => {
    it('prefers the early position for a field present in both source and output', () => {
      const { query } = buildNativeEsqlExceptionQuery({
        query: AGG_INPUT,
        items: [itemWith([match('user.name', 'included', 'svc_scan')])],
        source: schema({ 'user.name': 'keyword' }),
        output: schema({ count: 'long', 'user.name': 'keyword' }),
      });

      expect(query).toBe(
        'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(user.name, "svc_scan")) | STATS count = COUNT(*) BY user.name | WHERE count > 5'
      );
    });

    it('inserts an early and a late stage for one rule with both kinds of item', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: AGG_INPUT,
        items: [
          itemWith([match('host.name', 'included', 'jump-box')], 'early'),
          itemWith([match('count', 'included', '101')], 'late'),
        ],
        source: schema({ 'host.name': 'keyword', 'user.name': 'keyword' }),
        output: schema({ count: 'long', 'user.name': 'keyword' }),
      });

      expect(skipped).toEqual([]);
      expect(query).toBe(
        'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(host.name, "jump-box")) | STATS count = COUNT(*) BY user.name | WHERE count > 5\n| WHERE NOT (MV_CONTAINS(count, 101::long))'
      );
    });
  });

  describe('boolean structure (early position)', () => {
    it('AND-s the entries within a single item', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [
          itemWith([
            match('host.name', 'included', 'jump-box'),
            match('user.name', 'excluded', 'root'),
          ]),
        ],
        source: schema({ 'host.name': 'keyword', 'user.name': 'keyword' }),
        output: EMPTY,
      });

      expect(skipped).toEqual([]);
      expect(query).toBe(
        'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(host.name, "jump-box") AND NOT MV_CONTAINS(user.name, "root")) | WHERE event.category == "process"'
      );
    });

    it('OR-s separate items', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [
          itemWith([match('host.name', 'included', 'jump-box')], 'item-1'),
          itemWith([match('user.name', 'included', 'root')], 'item-2'),
        ],
        source: schema({ 'host.name': 'keyword', 'user.name': 'keyword' }),
        output: EMPTY,
      });

      expect(skipped).toEqual([]);
      expect(query).toBe(
        'FROM logs-* METADATA _id\n| WHERE NOT ((MV_CONTAINS(host.name, "jump-box")) OR (MV_CONTAINS(user.name, "root"))) | WHERE event.category == "process"'
      );
    });
  });

  describe('items that are not inlined leave the query unchanged', () => {
    it('reports nested entries', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [itemWith([nested('threat')])],
        source: schema({ threat: 'keyword' }),
        output: EMPTY,
      });

      expect(query).toBe(INPUT);
      expect(skipped).toEqual([
        { itemId: 'item-1', reason: 'nested entries have no native ES|QL path' },
      ]);
    });

    it('reports value-list entries (handled by the existing implementation)', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [itemWith([list('host.name', 'included')])],
        source: schema({ 'host.name': 'keyword' }),
        output: EMPTY,
      });

      expect(query).toBe(INPUT);
      expect(skipped).toEqual([
        {
          itemId: 'item-1',
          reason: 'value list exceptions are applied by the existing implementation',
        },
      ]);
    });

    it('skips the whole item when any one of its fields is in neither position', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [
          itemWith([
            match('host.name', 'included', 'jump-box'),
            match('unknown.field', 'included', 'x'),
          ]),
        ],
        source: schema({ 'host.name': 'keyword' }),
        output: EMPTY,
      });

      expect(query).toBe(INPUT);
      expect(skipped).toEqual([
        {
          itemId: 'item-1',
          reason: 'field "unknown.field" is not in the source index or the query output',
        },
      ]);
    });

    it('inlines the mapped item and reports the unmapped one alongside', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [
          itemWith([match('host.name', 'included', 'jump-box')], 'mapped'),
          itemWith([match('unknown.field', 'included', 'x')], 'unmapped'),
        ],
        source: schema({ 'host.name': 'keyword' }),
        output: EMPTY,
      });

      expect(query).toBe(
        'FROM logs-* METADATA _id\n| WHERE NOT (MV_CONTAINS(host.name, "jump-box")) | WHERE event.category == "process"'
      );
      expect(skipped).toEqual([
        {
          itemId: 'unmapped',
          reason: 'field "unknown.field" is not in the source index or the query output',
        },
      ]);
    });
  });

  describe('edge cases', () => {
    it('returns the query unchanged and no skips when there are no items', () => {
      expect(
        buildNativeEsqlExceptionQuery({ query: INPUT, items: [], source: EMPTY, output: EMPTY })
      ).toEqual({ query: INPUT, skipped: [] });
    });

    it('ignores an item that has no entries', () => {
      const { query, skipped } = buildNativeEsqlExceptionQuery({
        query: INPUT,
        items: [itemWith([])],
        source: EMPTY,
        output: EMPTY,
      });

      expect(query).toBe(INPUT);
      expect(skipped).toEqual([]);
    });
  });

  describe('getFromClause', () => {
    it('returns the FROM source command of a piped query', () => {
      expect(getFromClause(INPUT)).toBe('FROM logs-* METADATA _id');
    });

    it('returns the whole query when FROM is the only command', () => {
      expect(getFromClause('FROM logs-*')).toBe('FROM logs-*');
    });

    it('returns undefined when the query does not start with FROM', () => {
      expect(getFromClause('ROW x = 1')).toBeUndefined();
    });
  });
});
