/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  doesNotExistOperator,
  doesNotMatchOperator,
  existsOperator,
  isNotOneOfOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
  matchesOperator,
} from '../autocomplete_operators';
import { filterExceptionItems, getNewExceptionItem } from '../helpers';
import type { BuilderEntry, CreateExceptionListItemBuilderSchema } from '../types';
import {
  ESQL_OUTPUT_COLUMN_OPERATORS,
  getColumnTypesForOperator,
  getDefaultEsqlOutputColumnEntry,
  getEntryOnEsqlOutputColumnFieldChange,
  getEntryOnEsqlOutputColumnOperatorChange,
  getEntryOnEsqlOutputColumnTypeChange,
  getEntryOnEsqlOutputColumnValueChange,
  getEsqlOutputColumnOperator,
  isEsqlOutputColumnEntryComplete,
} from '.';

const matchEntry = (overrides: Record<string, unknown> = {}): BuilderEntry =>
  ({
    column_type: 'keyword',
    field: 'target_host',
    id: 'entry-1',
    operator: OperatorEnum.INCLUDED,
    type: OperatorTypeEnum.MATCH,
    value: 'dc-01',
    ...overrides,
  } as BuilderEntry);

describe('the entries of an item that applies to the ES|QL output columns', () => {
  describe('operators', () => {
    it('offers the operators that the end of the query supports, and no value list or nested operator', () => {
      expect(ESQL_OUTPUT_COLUMN_OPERATORS).toEqual([
        isOperator,
        isNotOperator,
        isOneOfOperator,
        isNotOneOfOperator,
        matchesOperator,
        doesNotMatchOperator,
        existsOperator,
        doesNotExistOperator,
      ]);
    });

    it('finds the operator of an entry', () => {
      expect(getEsqlOutputColumnOperator(matchEntry())).toBe(isOperator);
      expect(getEsqlOutputColumnOperator(matchEntry({ operator: OperatorEnum.EXCLUDED }))).toBe(
        isNotOperator
      );
      expect(
        getEsqlOutputColumnOperator(
          matchEntry({ type: OperatorTypeEnum.WILDCARD, operator: OperatorEnum.EXCLUDED })
        )
      ).toBe(doesNotMatchOperator);
    });
  });

  describe('the column types of an operator', () => {
    it('are all of them for exists and does not exist', () => {
      expect(getColumnTypesForOperator(existsOperator)).toHaveLength(11);
      expect(getColumnTypesForOperator(doesNotExistOperator)).toHaveLength(11);
    });

    it.each([isOperator, isNotOperator, isOneOfOperator, isNotOneOfOperator])(
      'are all but double for $message',
      (operator) => {
        const types = getColumnTypesForOperator(operator);
        expect(types).toHaveLength(10);
        expect(types).not.toContain('double');
      }
    );

    it.each([matchesOperator, doesNotMatchOperator])(
      'are keyword and text for $message',
      (operator) => {
        expect(getColumnTypesForOperator(operator)).toEqual(['keyword', 'text']);
      }
    );
  });

  describe('changing an entry', () => {
    it('changes the field and nothing else', () => {
      expect(getEntryOnEsqlOutputColumnFieldChange(matchEntry(), 'risk')).toEqual(
        matchEntry({ field: 'risk' })
      );
    });

    it('sets the column type, and removes it', () => {
      expect(getEntryOnEsqlOutputColumnTypeChange(matchEntry(), 'ip')).toEqual(
        matchEntry({ column_type: 'ip' })
      );
      expect(getEntryOnEsqlOutputColumnTypeChange(matchEntry(), undefined)).not.toHaveProperty(
        'column_type'
      );
    });

    it('keeps the column type and the value when the operator changes to one of the same shape that supports it', () => {
      expect(getEntryOnEsqlOutputColumnOperatorChange(matchEntry(), isNotOperator)).toEqual(
        matchEntry({ operator: OperatorEnum.EXCLUDED })
      );
    });

    it('clears the column type when the new operator does not support it', () => {
      const updated = getEntryOnEsqlOutputColumnOperatorChange(
        matchEntry({ column_type: 'ip', value: '10.0.0.1' }),
        matchesOperator
      );
      expect(updated).not.toHaveProperty('column_type');
      expect(updated).toMatchObject({ type: 'wildcard', operator: 'included', value: '' });
    });

    it('turns an is entry into an is one of entry with an empty list, and back with an empty value', () => {
      const oneOf = getEntryOnEsqlOutputColumnOperatorChange(matchEntry(), isOneOfOperator);
      expect(oneOf).toMatchObject({ type: 'match_any', value: [], column_type: 'keyword' });
      expect(getEntryOnEsqlOutputColumnOperatorChange(oneOf, isOperator)).toMatchObject({
        type: 'match',
        value: '',
      });
    });

    it('drops the value of an exists entry and keeps the column type', () => {
      const updated = getEntryOnEsqlOutputColumnOperatorChange(matchEntry(), existsOperator);
      expect(updated).toEqual({
        column_type: 'keyword',
        field: 'target_host',
        id: 'entry-1',
        operator: 'included',
        type: 'exists',
      });
    });

    it('sets a value for each entry type', () => {
      expect(getEntryOnEsqlOutputColumnValueChange(matchEntry(), 'dc-02')).toMatchObject({
        type: 'match',
        value: 'dc-02',
      });
      expect(
        getEntryOnEsqlOutputColumnValueChange(
          matchEntry({ type: OperatorTypeEnum.MATCH_ANY, value: [] }),
          ['a', 'b']
        )
      ).toMatchObject({ type: 'match_any', value: ['a', 'b'] });
      expect(
        getEntryOnEsqlOutputColumnValueChange(
          matchEntry({ type: OperatorTypeEnum.WILDCARD, value: '' }),
          'dc-*'
        )
      ).toMatchObject({ type: 'wildcard', value: 'dc-*' });
    });

    it('keeps the id, the operator and the column type when the value changes', () => {
      expect(
        getEntryOnEsqlOutputColumnValueChange(
          matchEntry({ operator: OperatorEnum.EXCLUDED, column_type: 'ip' }),
          '10.0.0.1'
        )
      ).toMatchObject({ id: 'entry-1', operator: 'excluded', column_type: 'ip' });
    });

    it('starts with an empty is entry that has no column type', () => {
      const entry = getDefaultEsqlOutputColumnEntry();
      expect(entry).toMatchObject({ field: '', operator: 'included', type: 'match', value: '' });
      expect(entry).not.toHaveProperty('column_type');
    });
  });

  describe('isEsqlOutputColumnEntryComplete', () => {
    it('is true for an entry with a field, a supported column type and a value', () => {
      expect(isEsqlOutputColumnEntryComplete(matchEntry())).toBe(true);
    });

    it.each([
      ['no field', { field: '' }],
      ['a blank field', { field: '  ' }],
      ['no column type', { column_type: undefined }],
      ['no value', { value: '' }],
      ['a blank value', { value: '   ' }],
      ['a column type that the operator does not support', { column_type: 'double' }],
      ['an empty list', { type: OperatorTypeEnum.MATCH_ANY, value: [] }],
      ['a blank value in the list', { type: OperatorTypeEnum.MATCH_ANY, value: ['a', ' '] }],
    ])('is false for an entry with %s', (_, overrides) => {
      expect(isEsqlOutputColumnEntryComplete(matchEntry(overrides))).toBe(false);
    });

    it('does not need a value for an exists entry', () => {
      expect(
        isEsqlOutputColumnEntryComplete(
          matchEntry({ type: OperatorTypeEnum.EXISTS, value: undefined })
        )
      ).toBe(true);
    });

    it('is false for a nested or a list entry', () => {
      expect(
        isEsqlOutputColumnEntryComplete({
          field: 'a',
          id: 'n',
          type: OperatorTypeEnum.NESTED,
          entries: [],
        } as unknown as BuilderEntry)
      ).toBe(false);
      expect(
        isEsqlOutputColumnEntryComplete(
          matchEntry({ type: OperatorTypeEnum.LIST, list: { id: 'l', type: 'ip' } })
        )
      ).toBe(false);
    });
  });

  describe('the item', () => {
    const item = (
      appliesTo: 'esql_output_columns' | undefined
    ): CreateExceptionListItemBuilderSchema => ({
      ...getNewExceptionItem({
        listId: 'list-1',
        name: 'item',
        namespaceType: 'single',
        appliesTo,
      }),
      entries: [matchEntry({ id: 'a' }), matchEntry({ id: 'b', column_type: undefined })],
    });

    it('is created without applies_to for the source documents, as every item is today', () => {
      expect(
        getNewExceptionItem({ listId: 'l', name: 'n', namespaceType: 'single' })
      ).not.toHaveProperty('applies_to');
      expect(
        getNewExceptionItem({
          listId: 'l',
          name: 'n',
          namespaceType: 'single',
          appliesTo: 'source_documents' as const,
        })
      ).not.toHaveProperty('applies_to');
    });

    it('is created with applies_to for the ES|QL output columns', () => {
      expect(item('esql_output_columns')).toHaveProperty('applies_to', 'esql_output_columns');
    });

    it('keeps only the complete entries of an item on the ES|QL output columns', () => {
      const [filtered] = filterExceptionItems([item('esql_output_columns')]);
      expect(filtered).toHaveProperty('applies_to', 'esql_output_columns');
      expect(filtered.entries).toHaveLength(1);
      expect(filtered.entries[0]).toMatchObject({ column_type: 'keyword', field: 'target_host' });
    });

    it('drops the item when none of its entries is complete', () => {
      expect(
        filterExceptionItems([
          { ...item('esql_output_columns'), entries: [matchEntry({ column_type: undefined })] },
        ])
      ).toEqual([]);
    });

    it('does not ask for a column type in an item on the source documents', () => {
      const [filtered] = filterExceptionItems([
        { ...item(undefined), entries: [matchEntry({ column_type: undefined })] },
      ]);
      expect(filtered.entries).toHaveLength(1);
    });
  });
});
