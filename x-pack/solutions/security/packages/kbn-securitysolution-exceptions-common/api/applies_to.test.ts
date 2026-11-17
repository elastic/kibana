/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_APPLIES_TO_VALUES, ESQL_OUTPUT_COLUMN_TYPES } from '../esql_output_columns';

import {
  CreateExceptionListItemRequestBody,
  CreateRuleExceptionListItemProps,
  EsqlOutputColumnType,
  ExceptionListItem,
  ExceptionListItemAppliesTo,
  UpdateExceptionListItemRequestBody,
} from '.';

const entry = { type: 'match', field: 'target_host', operator: 'included', value: 'dc-01' };

const createBody = {
  description: 'item',
  entries: [{ ...entry, column_type: 'keyword' }],
  list_id: 'list-1',
  name: 'item',
  type: 'simple',
};

describe('applies_to and column_type of the exceptions API', () => {
  it('has the values of the shared constants', () => {
    expect([...ExceptionListItemAppliesTo.options]).toEqual([...EXCEPTION_APPLIES_TO_VALUES]);
    expect([...EsqlOutputColumnType.options]).toEqual([...ESQL_OUTPUT_COLUMN_TYPES]);
  });

  describe('creating an item', () => {
    it.each(['source_documents', 'esql_output_columns'])('accepts applies_to %s', (appliesTo) => {
      const parsed = CreateExceptionListItemRequestBody.parse({
        ...createBody,
        applies_to: appliesTo,
      });
      expect(parsed).toEqual(expect.objectContaining({ applies_to: appliesTo }));
      expect(parsed.entries?.[0]).toEqual(expect.objectContaining({ column_type: 'keyword' }));
    });

    it('does not write applies_to when the body does not have it, so the item stays as it is today', () => {
      const parsed = CreateExceptionListItemRequestBody.parse({
        ...createBody,
        entries: [entry],
      });
      expect(parsed).not.toHaveProperty('applies_to');
      expect(parsed.entries?.[0]).not.toHaveProperty('column_type');
    });

    it.each([
      ['an applies_to that does not exist', { ...createBody, applies_to: 'esql_output_column' }],
      [
        'a column_type that does not exist',
        { ...createBody, entries: [{ ...entry, column_type: 'geo_point' }] },
      ],
    ])('rejects %s', (_, body) => {
      expect(CreateExceptionListItemRequestBody.safeParse(body).success).toBe(false);
    });

    it.each(ESQL_OUTPUT_COLUMN_TYPES)(
      'accepts the column_type %s on every entry type that has one',
      (columnType) => {
        const entries = [
          { ...entry, column_type: columnType },
          {
            type: 'match_any',
            field: 'f',
            operator: 'included',
            value: ['v'],
            column_type: columnType,
          },
          {
            type: 'wildcard',
            field: 'f',
            operator: 'included',
            value: 'v*',
            column_type: columnType,
          },
          { type: 'exists', field: 'f', operator: 'excluded', column_type: columnType },
        ];
        const parsed = CreateExceptionListItemRequestBody.parse({ ...createBody, entries });
        expect(parsed.entries).toEqual(entries);
      }
    );
  });

  it('accepts applies_to when updating an item', () => {
    const { list_id: listId, ...rest } = createBody;
    const parsed = UpdateExceptionListItemRequestBody.parse({
      ...rest,
      applies_to: 'esql_output_columns',
      item_id: 'item-1',
    });
    expect(parsed).toEqual(expect.objectContaining({ applies_to: 'esql_output_columns' }));
    expect(listId).toBe('list-1');
  });

  it('accepts applies_to when creating an item for a rule', () => {
    const { list_id: _listId, ...rest } = createBody;
    expect(
      CreateRuleExceptionListItemProps.parse({ ...rest, applies_to: 'esql_output_columns' })
    ).toEqual(expect.objectContaining({ applies_to: 'esql_output_columns' }));
    expect(CreateRuleExceptionListItemProps.parse(rest)).not.toHaveProperty('applies_to');
  });

  it('returns an item with and without applies_to', () => {
    const item = {
      id: '1',
      item_id: 'item-1',
      list_id: 'list-1',
      type: 'simple',
      name: 'item',
      description: 'item',
      entries: createBody.entries,
      namespace_type: 'single',
      comments: [],
      tie_breaker_id: 'tie-breaker',
      created_at: '2026-10-01T00:00:00.000Z',
      created_by: 'elastic',
      updated_at: '2026-10-01T00:00:00.000Z',
      updated_by: 'elastic',
    };
    expect(ExceptionListItem.parse(item)).not.toHaveProperty('applies_to');
    expect(ExceptionListItem.parse({ ...item, applies_to: 'esql_output_columns' })).toEqual(
      expect.objectContaining({ applies_to: 'esql_output_columns' })
    );
  });
});
