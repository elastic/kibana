/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

import {
  MAX_MATCH_ANY_VALUES,
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

const compile = (entries: Entry[], columns: Record<string, string>) =>
  compileEndStageItem(
    getExceptionListItemSchemaMock({ entries: entries as EntriesArray }),
    new Map(Object.entries(columns))
  );

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

    it('compares a text column by phrase, as the DSL match_phrase does', () => {
      expect(compile([match('note', 'a b')], { note: 'text' })).toEqual({
        clause: 'NOT (MATCH_PHRASE(note, "a b"))',
        fullText: true,
      });
      expect(compile([match('note', 'a b', 'excluded')], { note: 'text' })).toEqual({
        clause: 'MATCH_PHRASE(note, "a b")',
        fullText: true,
      });
    });

    it('escapes the phrase of a text column', () => {
      expect(compile([match('note', 'say "hi"\n')], { note: 'text' })).toEqual({
        clause: 'NOT (MATCH_PHRASE(note, "say \\"hi\\"\\n"))',
        fullText: true,
      });
    });

    it('does not mark the clause of a column that is not text as full text', () => {
      expect(compile([match('risk', 'low')], { risk: 'keyword' })).not.toHaveProperty('fullText');
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
      ['double', '3.14', '3.14::double'],
      ['double', '1e-7', '1e-7::double'],
      ['boolean', 'TRUE', 'true'],
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

    it.each([
      ['integer', 'abc'],
      ['integer', '2147483648'],
      ['integer', '4.5'],
      ['long', '9223372036854775808'],
      ['unsigned_long', '-1'],
      ['double', 'NaN'],
      ['double', '1e999'],
      ['boolean', 'maybe'],
      ['ip', '10.0.0.0/24'],
      ['ip', 'not-an-ip'],
      ['version', 'x.y'],
    ])('does not compile a value that does not cast to a %s column: %s', (type, value) => {
      // an uncastable literal becomes null, which would make the exception exclude every row
      expect(compile([match('col', value)], { col: type })).toEqual({
        reason: `value "${value}" is not a valid ${type}`,
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
      ['2026-09-30T16:00:00+02:00', 'date'],
      ['2026-09-30T14:00:00.123456Z', 'date'],
    ])('does not compile the unsupported date value %s on a %s column', (value, type) => {
      expect(compile([match('d', value)], { d: type })).toEqual({
        reason: `value "${value}" is not a supported ${type} format`,
      });
    });

    it('keeps the rows in the rounded range for "is not"', () => {
      expect(compile([match('d', '2026-09-30', 'excluded')], { d: 'date' })).toEqual({
        clause: range('d', 'date', '2026-09-30T00:00:00.000Z', '2026-09-30T23:59:59.999Z'),
      });
    });
  });

  describe('match_any ("is one of")', () => {
    it('joins one comparison per value', () => {
      expect(compile([matchAny('risk', ['low', 'medium'])], { risk: 'keyword' })).toEqual({
        clause: 'NOT (MV_CONTAINS(risk, "low") OR MV_CONTAINS(risk, "medium"))',
      });
    });

    it('does not add parentheses for a single value', () => {
      expect(compile([matchAny('risk', ['low'])], { risk: 'keyword' })).toEqual({
        clause: 'NOT (MV_CONTAINS(risk, "low"))',
      });
    });

    it('keeps the rows that match any value for "is not one of"', () => {
      expect(compile([matchAny('n', ['1', '2'], 'excluded')], { n: 'long' })).toEqual({
        clause: 'MV_CONTAINS(n, 1::long) OR MV_CONTAINS(n, 2::long)',
      });
    });

    it('joins one phrase per value on a text column', () => {
      expect(compile([matchAny('note', ['a b', 'c'])], { note: 'text' })).toEqual({
        clause: 'NOT (MATCH_PHRASE(note, "a b") OR MATCH_PHRASE(note, "c"))',
        fullText: true,
      });
    });

    it('does not compile a list with an invalid value', () => {
      expect(compile([matchAny('n', ['1', 'x'])], { n: 'long' })).toEqual({
        reason: 'value "x" is not a valid long',
      });
    });

    it('does not compile a list that is too long for one expression', () => {
      const values = Array.from({ length: MAX_MATCH_ANY_VALUES + 1 }, (_, i) => `v${i}`);
      expect(compile([matchAny('risk', values)], { risk: 'keyword' })).toEqual({
        reason: `an "is one of" list must have between 1 and ${MAX_MATCH_ANY_VALUES} values`,
      });
    });

    it('compiles the longest allowed list', () => {
      const values = Array.from({ length: MAX_MATCH_ANY_VALUES }, (_, i) => `v${i}`);
      expect(compile([matchAny('risk', values)], { risk: 'keyword' })).toHaveProperty('clause');
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

    it('does not compile "matches" on a text column, which the DSL compares by token', () => {
      expect(compile([wildcard('user', '*good*')], { user: 'text' })).toEqual({
        reason: expect.stringContaining(
          '"matches" with value "*good*" is not supported on a text column'
        ),
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
        reason: '"matches" with value "a\\" is not supported on a keyword column',
      });
    });

    it('does not compile "matches" on a column that is not a string', () => {
      expect(compile([wildcard('count', '1*')], { count: 'long' })).toEqual({
        reason: '"matches" with value "1*" is not supported on a long column',
      });
    });
  });

  describe('items', () => {
    it('combines the entries with AND', () => {
      expect(
        compile([match('risk', 'low'), exists('count')], { risk: 'keyword', count: 'long' })
      ).toEqual({ clause: 'NOT ((MV_CONTAINS(risk, "low")) AND (count IS NOT NULL))' });
    });

    it('marks an item as full text when one of its entries compares a text column', () => {
      expect(
        compile([match('note', 'a'), exists('count')], { note: 'text', count: 'long' })
      ).toEqual({
        clause: 'NOT ((MATCH_PHRASE(note, "a")) AND (count IS NOT NULL))',
        fullText: true,
      });
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
          reason: `column "col" has type "${type}", which cannot be tested at the end of the query`,
        });
      }
    );

    it('does not compile an entry for a column that the query does not output', () => {
      expect(compile([match('missing', 'a')], {})).toEqual({
        reason:
          'column "missing" has type "unknown", which cannot be tested at the end of the query',
      });
    });

    it.each(['list', 'nested'] as const)('does not compile %s entries', (type) => {
      const entry = (
        type === 'list'
          ? { field: 'col', operator: 'included', type: 'list', list: { id: 'l', type: 'keyword' } }
          : { field: 'col', type: 'nested', entries: [match('x', 'y')] }
      ) as Entry;
      expect(compile([entry], { col: 'keyword' })).toEqual({
        reason: `entries of type "${type}" are not supported at the end of the query`,
      });
    });
  });
});

describe('toEndStageQuerySuffix', () => {
  it('adds one WHERE stage per clause', () => {
    expect(toEndStageQuerySuffix(['NOT (a IS NOT NULL)', 'MV_CONTAINS(b, "x")'])).toBe(
      ' | WHERE NOT (a IS NOT NULL) | WHERE MV_CONTAINS(b, "x")'
    );
  });

  it('adds nothing when there are no clauses', () => {
    expect(toEndStageQuerySuffix([])).toBe('');
  });
});
