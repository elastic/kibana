/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import {
  MAX_COMPARISONS,
  MAX_QUERY_LENGTH,
  compileEndStageItem,
  quoteColumn,
  toEndStageQuerySuffix,
} from './build_end_stage_clause';

type Entry = EntriesArray[number];
type Operator = 'included' | 'excluded';

const match = (field: string, value: string, operator: Operator = 'included'): Entry => ({
  field,
  operator,
  type: 'match',
  value,
});
const matchAny = (field: string, value: string[], operator: Operator = 'included'): Entry => ({
  field,
  operator,
  type: 'match_any',
  value,
});
const exists = (field: string, operator: Operator = 'included'): Entry => ({
  field,
  operator,
  type: 'exists',
});
const wildcard = (field: string, value: string, operator: Operator = 'included'): Entry => ({
  field,
  operator,
  type: 'wildcard',
  value,
});

const compileWithWeight = (entries: Entry[], columns: Record<string, string>) =>
  compileEndStageItem(
    getExceptionListItemSchemaMock({ entries: entries as EntriesArray }),
    new Map(Object.entries(columns))
  );

const compile = (entries: Entry[], columns: Record<string, string>) => {
  const compiled = compileWithWeight(entries, columns);
  if ('terms' in compiled) {
    const { terms, ...rest } = compiled;
    return rest;
  }
  return compiled;
};

describe('compileEndStageItem', () => {
  describe('match ("is")', () => {
    it('compares a keyword column with a string literal', () => {
      expect(compile([match('risk', 'low')], { risk: 'keyword' })).toEqual({
        clause: 'NOT (MV_CONTAINS(risk, "low"))',
      });
    });

    it('keeps the rows that match the comparison for "is not"', () => {
      expect(compile([match('risk', 'low', 'excluded')], { risk: 'keyword' })).toEqual({
        clause: 'MV_CONTAINS(risk, "low")',
      });
    });

    it('compares a text column on the whole value and respecting case, as a keyword column', () => {
      expect(compile([match('note', 'Good.com')], { note: 'text' })).toEqual({
        clause: 'NOT (MV_CONTAINS(note, "Good.com"))',
      });
      expect(compile([match('note', 'a b', 'excluded')], { note: 'text' })).toEqual({
        clause: 'MV_CONTAINS(note, "a b")',
      });
    });

    it('escapes the value of a text column', () => {
      expect(compile([match('note', 'say "hi"\n')], { note: 'text' })).toEqual({
        clause: 'NOT (MV_CONTAINS(note, "say \\"hi\\"\\n"))',
      });
    });

    it('escapes quotes, backslashes and line breaks in the literal', () => {
      expect(compile([match('risk', 'a"b\\c\nd\re\tf')], { risk: 'keyword' })).toEqual({
        clause: 'NOT (MV_CONTAINS(risk, "a\\"b\\\\c\\nd\\re\\tf"))',
      });
    });

    it.each([
      ['integer', '5', '5::integer'],
      ['integer', '-5', '-5::integer'],
      ['integer', '+5', '5::integer'],
      ['long', '9223372036854775807', '9223372036854775807::long'],
      ['unsigned_long', '18446744073709551615', '18446744073709551615::unsigned_long'],
      ['boolean', 'true', 'true'],
      ['boolean', 'false', 'false'],
      ['ip', '10.0.0.1', '"10.0.0.1"::ip'],
      ['ip', '2001:db8::1', '"2001:db8::1"::ip'],
      ['version', '1.2.3', '"1.2.3"::version'],
      ['version', '1.2.3-beta', '"1.2.3-beta"::version'],
    ])('casts the value for a %s column: %s', (type, value, literal) => {
      expect(compile([match('col', value)], { col: type })).toEqual({
        clause: `NOT (MV_CONTAINS(col, ${literal}))`,
      });
    });

    // the DSL fails the request on these values too, so the executor fails the rule
    it.each([
      ['integer', 'abc'],
      ['integer', '0x10'],
      ['long', 'many'],
      ['unsigned_long', 'many'],
      ['boolean', 'maybe'],
      ['boolean', 'TRUE'],
      ['ip', '10.0.0.0/33'],
      ['ip', 'not-an-ip'],
    ])('reports the value of a %s column that cannot be written: %s', (type, value) => {
      // an uncastable literal becomes null, which would make the exception exclude every row
      expect(compile([match('col', value)], { col: type })).toEqual({
        skipReasons: [
          {
            code: 'value_not_supported',
            explanation: `value "${value}" cannot be written for a column of type ${type} at the end of the query`,
            fields: ['col'],
          },
        ],
      });
    });

    // the DSL accepts these values and the compiler does not write them, so the rule fails
    it.each([
      ['integer', '2147483648'],
      ['integer', '4.5'],
      ['integer', '1e3'],
      ['long', '9223372036854775808'],
      ['unsigned_long', '-1'],
      ['ip', '::/0'],
      ['ip', 'fe80::1%eth0/64'],
      ['ip', '1.2.3.4/+8'],
      ['version', 'x.y'],
      ['version', '99999999999999999999.1.1'],
    ])(
      'reports the value of a %s column that the DSL accepts and the compiler does not write: %s',
      (type, value) => {
        expect(compile([match('col', value)], { col: type })).toEqual({
          skipReasons: [
            {
              code: 'value_not_supported',
              explanation: `value "${value}" cannot be written for a column of type ${type} at the end of the query`,
              fields: ['col'],
            },
          ],
        });
      }
    );
  });

  describe('match on ip ranges', () => {
    const range = (first: string, last: string) =>
      `COALESCE(MV_IN_RANGE(addr, "${first}"::ip, "${last}"::ip), false)`;

    it('writes a CIDR value as a range of addresses, so any value of a multi-valued column can match', () => {
      expect(compile([match('addr', '10.0.0.0/24')], { addr: 'ip' })).toEqual({
        clause: `NOT (${range('10.0.0.0', '10.0.0.255')})`,
      });
    });

    it('ignores the bits of the address after the prefix, as Elasticsearch does', () => {
      expect(compile([match('addr', '10.0.0.77/24')], { addr: 'ip' })).toEqual({
        clause: `NOT (${range('10.0.0.0', '10.0.0.255')})`,
      });
    });

    it('keeps the rows in the range for "is not"', () => {
      expect(compile([match('addr', '10.0.0.0/24', 'excluded')], { addr: 'ip' })).toEqual({
        clause: range('10.0.0.0', '10.0.0.255'),
      });
    });

    it('writes an IPv6 prefix as a range', () => {
      expect(compile([match('addr', '2001:db8::/32')], { addr: 'ip' })).toEqual({
        clause: `NOT (${range('2001:db8:0:0:0:0:0:0', '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff')})`,
      });
    });

    it('mixes addresses and ranges in an "is one of" list', () => {
      expect(compile([matchAny('addr', ['10.0.0.1', '10.0.0.0/30'])], { addr: 'ip' })).toEqual({
        clause: `NOT (MV_INTERSECTS(addr, TO_IP(["10.0.0.1"])) OR ${range(
          '10.0.0.0',
          '10.0.0.3'
        )})`,
      });
    });
  });

  describe('match on dates', () => {
    const range = (column: string, type: string, lower: string, upper: string) =>
      `COALESCE(MV_IN_RANGE(${column}, "${lower}"::${type}, "${upper}"::${type}), false)`;

    it.each([
      ['2026-09-30', '2026-09-30T00:00:00.000Z', '2026-09-30T23:59:59.999Z'],
      ['2026-09', '2026-09-01T00:00:00.000Z', '2026-09-01T23:59:59.999Z'],
      ['2026', '2026-01-01T00:00:00.000Z', '2026-01-01T23:59:59.999Z'],
      ['2026-09-30T14', '2026-09-30T14:00:00.000Z', '2026-09-30T14:59:59.999Z'],
      ['2026-09-30T14:05', '2026-09-30T14:05:00.000Z', '2026-09-30T14:05:59.999Z'],
      ['2026-09-30T14:05:09', '2026-09-30T14:05:09.000Z', '2026-09-30T14:05:09.999Z'],
      ['2026-09-30T14:05:09Z', '2026-09-30T14:05:09.000Z', '2026-09-30T14:05:09.999Z'],
      ['2026-09-30T16:05:09+02:00', '2026-09-30T14:05:09.000Z', '2026-09-30T14:05:09.999Z'],
      ['2026-09-30T16:05:09+0200', '2026-09-30T14:05:09.000Z', '2026-09-30T14:05:09.999Z'],
      ['2026-09-30T16:05+02', '2026-09-30T14:05:00.000Z', '2026-09-30T14:05:59.999Z'],
      ['2026-09-30T16+02:00', '2026-09-30T14:00:00.000Z', '2026-09-30T14:59:59.999Z'],
      ['2026-09-30T01:30-05:30', '2026-09-30T07:00:00.000Z', '2026-09-30T07:00:59.999Z'],
      ['2026-09-30T01:00:00+02:00', '2026-09-29T23:00:00.000Z', '2026-09-29T23:00:00.999Z'],
      ['2026-09-30T10:00:00+18:00', '2026-09-29T16:00:00.000Z', '2026-09-29T16:00:00.999Z'],
    ])('rounds %s to the unit of the value, as the DSL does', (value, lower, upper) => {
      expect(compile([match('d', value)], { d: 'date' })).toEqual({
        clause: `NOT (${range('d', 'date', lower, upper)})`,
      });
    });

    it('uses the last nanosecond as the upper bound of a date_nanos column', () => {
      expect(compile([match('d', '2026-09-30')], { d: 'date_nanos' })).toEqual({
        clause: `NOT (${range(
          'd',
          'date_nanos',
          '2026-09-30T00:00:00.000Z',
          '2026-09-30T23:59:59.999999999Z'
        )})`,
      });
    });

    it('compares the instant in UTC when the value has a fraction and an offset', () => {
      expect(compile([match('d', '2026-09-30T16:00:00.123+02:00')], { d: 'date' })).toEqual({
        clause: 'NOT (MV_CONTAINS(d, "2026-09-30T14:00:00.123Z"::date))',
      });
      expect(
        compile([match('d', '2026-09-30T16:00:00.123456789+02:00')], { d: 'date_nanos' })
      ).toEqual({
        clause: 'NOT (MV_CONTAINS(d, "2026-09-30T14:00:00.123456789Z"::date_nanos))',
      });
    });

    it('compares an exact instant when the value has a fraction', () => {
      expect(compile([match('d', '2026-09-30T14:00:00.123Z')], { d: 'date' })).toEqual({
        clause: 'NOT (MV_CONTAINS(d, "2026-09-30T14:00:00.123Z"::date))',
      });
      expect(compile([match('d', '2026-09-30T14:00:00.123456789Z')], { d: 'date_nanos' })).toEqual({
        clause: 'NOT (MV_CONTAINS(d, "2026-09-30T14:00:00.123456789Z"::date_nanos))',
      });
    });

    it.each([
      ['2026/09/30', 'date'],
      ['1759240800000', 'date'],
      ['2026-13-01', 'date'],
      ['2026-02-30', 'date'],
      ['2026-09-30T25', 'date'],
      // an offset that the DSL does not accept, and an offset on a value with no time
      ['2026-09-30T16:00:00+19:00', 'date'],
      ['2026-09-30T16:00:00+18:30', 'date'],
      ['2026-09-30T16:00:00+02:60', 'date'],
      ['2026-09-30T16:00:00+2:00', 'date'],
      ['2026-09-30+02:00', 'date'],
      ['2026-09-30T14:00:00.123456Z', 'date'],
      // the DSL filter fails on these as well
      ['2026Z', 'date'],
      ['2026-09Z', 'date'],
      ['2026-09-30Z', 'date'],
      ['2026-09-30Z', 'date_nanos'],
      ['2026-09-30T14', 'date_nanos'],
      ['2026-09-30T14:05', 'date_nanos'],
      ['2026-09-30T14:05Z', 'date_nanos'],
    ])(
      'reports the date value %s on a %s column that the compiler does not write',
      (value, type) => {
        // the rule fails for a date value that the compiler does not write
        expect(compile([match('d', value)], { d: type })).toEqual({
          skipReasons: [
            {
              code: 'value_not_supported',
              explanation: `value "${value}" cannot be written for a column of type ${type} because it is not in a supported format`,
              fields: ['d'],
            },
          ],
        });
      }
    );

    it('keeps the rows in the rounded range for "is not"', () => {
      expect(compile([match('d', '2026-09-30', 'excluded')], { d: 'date' })).toEqual({
        clause: range('d', 'date', '2026-09-30T00:00:00.000Z', '2026-09-30T23:59:59.999Z'),
      });
    });
  });

  describe('match_any ("is one of")', () => {
    it('tests the whole list with one call', () => {
      expect(compile([matchAny('risk', ['low', 'medium'])], { risk: 'keyword' })).toEqual({
        clause: 'NOT (MV_INTERSECTS(risk, ["low", "medium"]))',
      });
    });

    it('uses the same call for a list of one value', () => {
      expect(compile([matchAny('risk', ['low'])], { risk: 'keyword' })).toEqual({
        clause: 'NOT (MV_INTERSECTS(risk, ["low"]))',
      });
    });

    it('keeps the rows that match any value for "is not one of"', () => {
      expect(compile([matchAny('n', ['1', '2'], 'excluded')], { n: 'long' })).toEqual({
        clause: 'MV_INTERSECTS(n, TO_LONG(["1", "2"]))',
      });
    });

    // the list literal of ES|QL does not accept casts, so the types that need one convert the whole list
    it.each([
      ['keyword', ['a', 'b"c'], '["a", "b\\"c"]'],
      ['boolean', ['true', 'false'], '[true, false]'],
      ['integer', ['42', '-7'], 'TO_INTEGER(["42", "-7"])'],
      ['long', ['9000000000', '1'], 'TO_LONG(["9000000000", "1"])'],
      [
        'unsigned_long',
        ['18446744073709551615', '1'],
        'TO_UNSIGNED_LONG(["18446744073709551615", "1"])',
      ],
      ['ip', ['10.0.0.1', '2001:db8::1'], 'TO_IP(["10.0.0.1", "2001:db8::1"])'],
      ['version', ['1.2.3', '2.0.0-beta'], 'TO_VERSION(["1.2.3", "2.0.0-beta"])'],
    ])('writes the list of a %s column as one value', (type, values, list) => {
      expect(compile([matchAny('col', values)], { col: type })).toEqual({
        clause: `NOT (MV_INTERSECTS(col, ${list}))`,
      });
    });

    it('keeps one range per value for dates, which are rounded to the unit of the value', () => {
      const result = compile([matchAny('d', ['2026-09-30', '2026-08-01'])], { d: 'date' });
      expect(result).toHaveProperty('clause');
      expect((result as { clause: string }).clause).not.toContain('MV_INTERSECTS');
      expect((result as { clause: string }).clause.match(/MV_IN_RANGE/g)).toHaveLength(2);
    });

    it('writes the list of a text column as one call, as a keyword column', () => {
      expect(compile([matchAny('note', ['a b', 'c'])], { note: 'text' })).toEqual({
        clause: 'NOT (MV_INTERSECTS(note, ["a b", "c"]))',
      });
    });

    it('does not compile a list with an invalid value', () => {
      expect(compile([matchAny('n', ['1', 'x'])], { n: 'long' })).toEqual({
        skipReasons: [
          {
            code: 'value_not_supported',
            explanation:
              'value "x" cannot be written for a column of type long at the end of the query',
            fields: ['n'],
          },
        ],
      });
    });

    it('does not compile an empty list', () => {
      expect(compile([matchAny('risk', [])], { risk: 'keyword' })).toEqual({
        skipReasons: [
          {
            code: 'list_size_not_supported',
            explanation: 'an "is one of" list must have at least one value',
            fields: ['risk'],
          },
        ],
      });
    });

    it('compiles a long list as one call, with no limit on the number of values', () => {
      const values = Array.from({ length: 5000 }, (_, i) => `v${i}`);
      const compiled = compileWithWeight([matchAny('risk', values)], { risk: 'keyword' });
      expect(compiled).toMatchObject({ terms: 1 });
      expect((compiled as { clause: string }).clause.match(/MV_INTERSECTS/g)).toHaveLength(1);
    });
  });

  describe('exists', () => {
    it('is supported on a text column', () => {
      expect(compile([exists('note')], { note: 'text' })).toEqual({
        clause: 'NOT (note IS NOT NULL)',
      });
    });

    it('excludes the rows where the column is not null', () => {
      expect(compile([exists('count')], { count: 'long' })).toEqual({
        clause: 'NOT (count IS NOT NULL)',
      });
    });

    it('keeps the rows where the column is not null for "does not exist"', () => {
      expect(compile([exists('count', 'excluded')], { count: 'long' })).toEqual({
        clause: 'count IS NOT NULL',
      });
    });
  });

  describe('wildcard ("matches")', () => {
    it('uses MV_LIKE on a keyword column', () => {
      expect(compile([wildcard('user', 'good-*')], { user: 'keyword' })).toEqual({
        clause: 'NOT (COALESCE(MV_LIKE(user, "good-*"), false))',
      });
    });

    it('keeps the rows that match for "does not match"', () => {
      expect(compile([wildcard('user', 'good-*', 'excluded')], { user: 'keyword' })).toEqual({
        clause: 'COALESCE(MV_LIKE(user, "good-*"), false)',
      });
    });

    it('compiles "matches" on a text column on the whole value, as a keyword column', () => {
      expect(compile([wildcard('user', '*good*')], { user: 'text' })).toEqual({
        clause: 'NOT (COALESCE(MV_LIKE(user, "*good*"), false))',
      });
      expect(compile([wildcard('user', 'good*', 'excluded')], { user: 'text' })).toEqual({
        clause: 'COALESCE(MV_LIKE(user, "good*"), false)',
      });
    });

    it.each([
      ['a\\*b', 'COALESCE(MV_LIKE(user, "a\\\\*b"), false)'],
      ['a\\?b', 'COALESCE(MV_LIKE(user, "a\\\\?b"), false)'],
      ['a\\\\b', 'COALESCE(MV_LIKE(user, "a\\\\\\\\b"), false)'],
      ['a\\b*', 'COALESCE(MV_LIKE(user, "ab*"), false)'],
      ['say "*', 'COALESCE(MV_LIKE(user, "say \\"*"), false)'],
    ])('keeps the escaping of %s that the DSL applies', (value, clause) => {
      expect(compile([wildcard('user', value)], { user: 'keyword' })).toEqual({
        clause: `NOT (${clause})`,
      });
    });

    it('does not compile a pattern that ends with a lone backslash', () => {
      expect(compile([wildcard('user', 'a\\')], { user: 'keyword' })).toEqual({
        skipReasons: [
          {
            code: 'value_not_supported',
            explanation:
              'value "a\\" cannot be written for a column of type keyword at the end of the query',
            fields: ['user'],
          },
        ],
      });
    });

    it('does not compile "matches" on a column that is not a string', () => {
      expect(compile([wildcard('count', '1*')], { count: 'long' })).toEqual({
        skipReasons: [
          {
            code: 'operator_not_supported_on_type',
            explanation: '"matches" with value "1*" is not supported on a long column',
            fields: ['count'],
          },
        ],
      });
    });
  });

  describe('double columns', () => {
    // ES|QL reports float and half_float fields as double with the precision of the original type
    it.each([
      ['is', () => match('d', '0.1')],
      ['is not', () => match('d', '0.1', 'excluded')],
      ['is one of', () => matchAny('d', ['0.1', '2.5'])],
      ['is not one of', () => matchAny('d', ['0.1'], 'excluded')],
    ])(
      'does not apply "%s", because a float is widened and an equality can miss the value',
      (_, entry) => {
        expect(compile([entry()], { d: 'double' })).toEqual({
          skipReasons: [
            {
              code: 'operator_not_supported_on_type',
              explanation: expect.stringContaining('on a double column'),
              fields: ['d'],
            },
          ],
        });
      }
    );

    it('still applies "exists"', () => {
      expect(compile([exists('d')], { d: 'double' })).toEqual({ clause: 'NOT (d IS NOT NULL)' });
    });

    it('does not apply "is" on a double column, whatever the value', () => {
      expect(compile([match('d', 'many')], { d: 'double' })).toEqual({
        skipReasons: [
          expect.objectContaining({ code: 'operator_not_supported_on_type', fields: ['d'] }),
        ],
      });
    });
  });

  describe('items with os_types', () => {
    const entries = [match('risk', 'low')] as EntriesArray;

    it('does not apply an item that is restricted to operating systems, which only the DSL filter applies', () => {
      const item = getExceptionListItemSchemaMock({ entries, os_types: ['windows', 'linux'] });
      expect(compileEndStageItem(item, new Map([['risk', 'keyword']]))).toEqual({
        skipReasons: [
          {
            code: 'os_types_not_supported',
            explanation:
              'the item is restricted to the operating systems windows, linux (os_types), which only the DSL filter applies',
            fields: ['risk'],
          },
        ],
      });
    });

    it('applies an item with an empty os_types', () => {
      const item = getExceptionListItemSchemaMock({ entries, os_types: [] });
      expect(compileEndStageItem(item, new Map([['risk', 'keyword']]))).toHaveProperty('clause');
    });
  });

  describe('column names with an empty segment', () => {
    // ES|QL rejects an empty quoted segment (`a`.``.`b`), so the whole name is one quoted identifier, which is the same column
    it.each([
      ['a..b', '`a..b`'],
      ['.a', '`.a`'],
      ['a.', '`a.`'],
      ['a..`b', '`a..``b`'],
    ])('quotes %s as one identifier', (name, quoted) => {
      expect(quoteColumn(name)).toBe(quoted);
    });

    it('compares the column with the whole name quoted', () => {
      expect(compile([match('a..b', 'x')], { 'a..b': 'keyword' })).toEqual({
        clause: 'NOT (MV_CONTAINS(`a..b`, "x"))',
      });
    });
  });

  describe('column names that are reserved words', () => {
    it.each([
      'first',
      'last',
      'by',
      'in',
      'is',
      'not',
      'like',
      'asc',
      'desc',
      'true',
      'false',
      'null',
      'where',
      'with',
      'FIRST',
    ])('quotes %s, which ES|QL does not accept as an unquoted column name', (name) => {
      expect(quoteColumn(name)).toBe(`\`${name}\``);
      expect(compile([match(name, 'a')], { [name]: 'keyword' })).toEqual({
        clause: `NOT (MV_CONTAINS(\`${name}\`, "a"))`,
      });
    });

    it('quotes only the segment that is a reserved word', () => {
      expect(quoteColumn('a.by')).toBe('a.`by`');
      expect(quoteColumn('not.x')).toBe('`not`.x');
    });

    it('does not quote a name that only contains a reserved word', () => {
      expect(quoteColumn('firstName')).toBe('firstName');
      expect(quoteColumn('by_user')).toBe('by_user');
    });
  });

  describe('items', () => {
    it('combines the entries with AND', () => {
      expect(
        compile([match('risk', 'low'), exists('count')], { risk: 'keyword', count: 'long' })
      ).toEqual({ clause: 'NOT ((MV_CONTAINS(risk, "low")) AND (count IS NOT NULL))' });
    });

    it('negates only the excluded entries when an item has several', () => {
      expect(
        compile([match('risk', 'low', 'excluded'), exists('count')], {
          risk: 'keyword',
          count: 'long',
        })
      ).toEqual({
        clause: 'NOT ((NOT (MV_CONTAINS(risk, "low"))) AND (count IS NOT NULL))',
      });
    });

    it('reports a value that cannot be written together with the entries that are skipped for another reason', () => {
      expect(
        compile([match('geo', 'a'), match('ip', 'bogus')], { geo: 'geo_point', ip: 'ip' })
      ).toEqual({
        skipReasons: [
          expect.objectContaining({ code: 'column_type_not_supported', fields: ['geo'] }),
          {
            code: 'value_not_supported',
            explanation:
              'value "bogus" cannot be written for a column of type ip at the end of the query',
            fields: ['ip'],
          },
        ],
      });
    });

    it('reports the value that cannot be written of each entry', () => {
      expect(compile([match('a', 'x'), match('b', 'y')], { a: 'long', b: 'ip' })).toEqual({
        skipReasons: [
          expect.objectContaining({
            code: 'value_not_supported',
            explanation:
              'value "x" cannot be written for a column of type long at the end of the query',
            fields: ['a'],
          }),
          expect.objectContaining({
            code: 'value_not_supported',
            explanation:
              'value "y" cannot be written for a column of type ip at the end of the query',
            fields: ['b'],
          }),
        ],
      });
    });

    it('reports every value of a list that cannot be written, and none of the valid ones', () => {
      expect(compile([matchAny('n', ['1', 'x', '2', 'y'])], { n: 'long' })).toEqual({
        skipReasons: [
          expect.objectContaining({ explanation: expect.stringContaining('value "x"') }),
          expect.objectContaining({ explanation: expect.stringContaining('value "y"') }),
        ],
      });
    });

    it('quotes column names that are not plain identifiers', () => {
      expect(compile([match('host-name', 'a')], { 'host-name': 'keyword' })).toEqual({
        clause: 'NOT (MV_CONTAINS(`host-name`, "a"))',
      });
      expect(quoteColumn('a.b-c')).toBe('a.`b-c`');
      expect(quoteColumn('@timestamp')).toBe('@timestamp');
    });

    it.each(['geo_point', 'unsupported', 'flattened', 'dense_vector'])(
      'does not compile a column of type %s',
      (type) => {
        expect(compile([exists('col')], { col: type })).toEqual({
          skipReasons: [
            {
              code: 'column_type_not_supported',
              explanation: `column "col" has type "${type}", which cannot be tested at the end of the query`,
              fields: ['col'],
            },
          ],
        });
      }
    );

    it('does not compile an entry for a column that the query does not output', () => {
      expect(compile([match('missing', 'a')], {})).toEqual({
        skipReasons: [
          {
            code: 'column_type_not_supported',
            explanation:
              'column "missing" has type "unknown", which cannot be tested at the end of the query',
            fields: ['missing'],
          },
        ],
      });
    });

    it.each(['list', 'nested'] as const)('does not compile %s entries', (type) => {
      const entry = (
        type === 'list'
          ? { field: 'col', operator: 'included', type: 'list', list: { id: 'l', type: 'keyword' } }
          : { field: 'col', type: 'nested', entries: [match('x', 'y')] }
      ) as Entry;
      expect(compile([entry], { col: 'keyword' })).toEqual({
        skipReasons: [
          {
            code: 'entry_type_not_supported',
            explanation: `entries of type "${type}" are not supported at the end of the query`,
            fields: ['col'],
          },
        ],
      });
    });
  });
});

describe('the comparisons of an item', () => {
  const termsOf = (entries: Entry[], columns: Record<string, string>) => {
    const compiled = compileWithWeight(entries, columns);
    return 'terms' in compiled ? compiled.terms : undefined;
  };

  it('counts one for an entry, and does not grow with the number of values of an "is one of"', () => {
    expect(termsOf([match('risk', 'low')], { risk: 'keyword' })).toBe(1);
    expect(termsOf([matchAny('risk', ['a', 'b', 'c'])], { risk: 'keyword' })).toBe(1);
  });

  it('counts the comparisons of all the entries', () => {
    expect(
      termsOf([matchAny('risk', ['a', 'b', 'c']), exists('count')], {
        risk: 'keyword',
        count: 'long',
      })
    ).toBe(2);
  });

  it('counts one for each CIDR value, which is written as its own range', () => {
    expect(
      termsOf([matchAny('addr', ['10.0.0.1', '10.0.0.0/30', '10.0.1.0/30'])], { addr: 'ip' })
    ).toBe(3);
  });
});

describe('toEndStageQuerySuffix', () => {
  const entry = getExceptionListItemSchemaMock({
    list_id: 'my-list',
    item_id: 'my-item',
    name: 'my item',
  });
  const item = (clause: string, terms = 1, name = 'my item') => ({
    item: { ...entry, name },
    clause,
    terms,
  });
  const suffixOf = (items: ReturnType<typeof item>[], queryLength = 0): string => {
    const result = toEndStageQuerySuffix(items, queryLength);
    if ('limit' in result) {
      throw new Error(result.limit.reason);
    }
    return result.suffix;
  };
  const limitOf = (items: ReturnType<typeof item>[], queryLength = 0) => {
    const result = toEndStageQuerySuffix(items, queryLength);
    return 'limit' in result ? result.limit : undefined;
  };

  it('puts one item in one WHERE stage without parentheses', () => {
    expect(suffixOf([item('NOT (a IS NOT NULL)')])).toBe('\n| WHERE NOT (a IS NOT NULL)');
  });

  it('joins the items with AND and parentheses in one WHERE stage', () => {
    expect(
      suffixOf([item('NOT (a IS NOT NULL)'), item('MV_CONTAINS(b, "x") OR MV_CONTAINS(b, "y")')])
    ).toBe('\n| WHERE (NOT (a IS NOT NULL)) AND (MV_CONTAINS(b, "x") OR MV_CONTAINS(b, "y"))');
  });

  it('keeps the order of the items', () => {
    expect(suffixOf([item('A'), item('B'), item('C')])).toBe('\n| WHERE (A) AND (B) AND (C)');
  });

  it('adds nothing when there are no items', () => {
    expect(suffixOf([])).toBe('');
  });

  describe('limits', () => {
    it('accepts the comparisons that the limit allows, in one stage', () => {
      const items = Array.from({ length: MAX_COMPARISONS }, (_, i) => item(`C${i}`));
      expect(limitOf(items)).toBeUndefined();
      expect(suffixOf(items).split('\n| WHERE ')).toHaveLength(2);
    });

    it('reports the comparisons of all the items together, so that splitting an item does not help', () => {
      const oneItem = [item('BIG', MAX_COMPARISONS + 1)];
      const manyItems = Array.from({ length: MAX_COMPARISONS + 1 }, (_, i) => item(`C${i}`));
      expect(limitOf(oneItem)).toEqual(expect.objectContaining({ limit: 'comparisons' }));
      expect(limitOf(manyItems)).toEqual(expect.objectContaining({ limit: 'comparisons' }));
    });

    it('tells how many comparisons are needed and names the items with the most', () => {
      const limit = limitOf([
        item('A', 150, 'first'),
        item('B', 40, 'second'),
        item('C', 20, 'third'),
        item('D', 5, 'fourth'),
      ]);

      expect(limit?.reason).toBe(
        `the exceptions on the columns of the query need 215 comparisons, and at most ${MAX_COMPARISONS} are allowed (a comparison is one test on a column: an entry, or one CIDR value or date of an "is one of" entry). The items with the most comparisons are: the item "first" (list "my-list", item "my-item") has 150, the item "second" (list "my-list", item "my-item") has 40, the item "third" (list "my-list", item "my-item") has 20`
      );
    });

    it('reports the item that makes the query longer than the maximum length', () => {
      const long = item('x'.repeat(MAX_QUERY_LENGTH * 0.4));
      expect(limitOf([long, long])).toBeUndefined();
      expect(limitOf([long, long, long])).toEqual(
        expect.objectContaining({ limit: 'query_length' })
      );
    });

    it('counts the query that the stage is appended to', () => {
      expect(limitOf([item('A')], MAX_QUERY_LENGTH)).toEqual(
        expect.objectContaining({ limit: 'query_length' })
      );
    });

    it('reports the comparisons before the length', () => {
      expect(limitOf([item('x'.repeat(MAX_QUERY_LENGTH), MAX_COMPARISONS + 1)])).toEqual(
        expect.objectContaining({ limit: 'comparisons' })
      );
    });
  });
});
