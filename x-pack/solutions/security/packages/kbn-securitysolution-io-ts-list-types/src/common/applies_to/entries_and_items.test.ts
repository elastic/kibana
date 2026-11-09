/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import type * as t from 'io-ts';

import { entriesArray } from '../entries';
import { entriesExists } from '../entries_exist';
import { entriesMatch } from '../entry_match';
import { entriesMatchAny } from '../entry_match_any';
import { entriesMatchWildcard } from '../entry_match_wildcard';
import { nonEmptyEntriesArray } from '../non_empty_entries_array';
import { createExceptionListItemSchema } from '../../request/create_exception_list_item_schema';
import { createRuleExceptionListItemSchema } from '../../request/create_rule_exception_item_schema';
import { importExceptionListItemSchema } from '../../request/import_exception_item_schema';
import { updateExceptionListItemSchema } from '../../request/update_exception_list_item_schema';
import { exceptionListItemSchema } from '../../response/exception_list_item_schema';

const decode = (codec: t.Mixed, payload: unknown) => {
  const decoded = codec.decode(payload);
  const checked = exactCheck(payload, decoded);
  const message = pipe(checked, foldLeftRight);
  return { errors: getPaths(left(message.errors)), schema: message.schema };
};

const entries = {
  match: { type: 'match', field: 'f', operator: 'included', value: 'v' },
  match_any: { type: 'match_any', field: 'f', operator: 'included', value: ['v'] },
  wildcard: { type: 'wildcard', field: 'f', operator: 'included', value: 'v*' },
  exists: { type: 'exists', field: 'f', operator: 'excluded' },
};

describe('column_type of the entries', () => {
  describe.each([
    ['match', entriesMatch],
    ['match_any', entriesMatchAny],
    ['wildcard', entriesMatchWildcard],
    ['exists', entriesExists],
  ] as const)('%s', (type, codec) => {
    test('it validates an entry that does not have it, as before', () => {
      const payload = entries[type];
      expect(decode(codec, payload)).toEqual({ errors: [], schema: payload });
    });

    test.each(['keyword', 'ip', 'date_nanos'])(
      'it validates an entry with the column_type %s',
      (columnType) => {
        const payload = { ...entries[type], column_type: columnType };
        expect(decode(codec, payload)).toEqual({ errors: [], schema: payload });
      }
    );

    test('it fails to validate an unknown column_type', () => {
      expect(decode(codec, { ...entries[type], column_type: 'geo_point' }).errors).not.toEqual([]);
    });

    test('it still rejects an unknown property', () => {
      expect(decode(codec, { ...entries[type], other: 1 }).errors).toEqual([
        'invalid keys "other"',
      ]);
    });
  });

  test('the entries arrays validate entries with a column_type', () => {
    const payload = [
      { ...entries.match, column_type: 'keyword' },
      { ...entries.wildcard, column_type: 'text' },
    ];
    expect(decode(entriesArray, payload)).toEqual({ errors: [], schema: payload });
    expect(decode(nonEmptyEntriesArray, payload)).toEqual({ errors: [], schema: payload });
  });
});

describe('applies_to of the items', () => {
  const create = {
    description: 'item',
    entries: [{ ...entries.match, column_type: 'keyword' }],
    list_id: 'list-1',
    name: 'item',
    type: 'simple',
  };

  test.each([
    ['create', createExceptionListItemSchema],
    ['update', updateExceptionListItemSchema],
    ['import', importExceptionListItemSchema],
    ['create for a rule', createRuleExceptionListItemSchema],
  ] as const)('%s validates an item with and without it', (kind, codec) => {
    const base: Record<string, unknown> = { ...create };
    if (kind === 'import') {
      base.item_id = 'item-1';
    }
    if (kind === 'update') {
      delete base.list_id;
    }
    if (kind === 'create for a rule') {
      delete base.list_id;
    }

    const withoutIt = decode(codec as unknown as t.Mixed, base);
    expect(withoutIt.errors).toEqual([]);
    expect(withoutIt.schema).not.toHaveProperty('applies_to');
    for (const appliesTo of ['source_documents', 'esql_output_columns']) {
      const withIt = decode(codec as unknown as t.Mixed, { ...base, applies_to: appliesTo });
      expect(withIt.errors).toEqual([]);
      expect(withIt.schema).toHaveProperty('applies_to', appliesTo);
    }
    expect(decode(codec as unknown as t.Mixed, { ...base, applies_to: 'foo' }).errors).not.toEqual(
      []
    );
  });

  test('the response validates an item with and without it, and the item does not need it', () => {
    const item = {
      _version: undefined,
      comments: [],
      created_at: '2026-10-01T00:00:00.000Z',
      created_by: 'elastic',
      description: 'item',
      entries: [entries.match],
      expire_time: undefined,
      id: '1',
      item_id: 'item-1',
      list_id: 'list-1',
      meta: undefined,
      name: 'item',
      namespace_type: 'single',
      os_types: [],
      tags: [],
      tie_breaker_id: 'tie-breaker',
      type: 'simple',
      updated_at: '2026-10-01T00:00:00.000Z',
      updated_by: 'elastic',
    };
    expect(decode(exceptionListItemSchema, item).errors).toEqual([]);
    expect(decode(exceptionListItemSchema, item).schema).not.toHaveProperty('applies_to');

    const esqlItem = { ...item, applies_to: 'esql_output_columns' };
    expect(decode(exceptionListItemSchema, esqlItem)).toEqual({ errors: [], schema: esqlItem });
    expect(decode(exceptionListItemSchema, { ...item, applies_to: 'foo' }).errors).not.toEqual([]);
  });
});
