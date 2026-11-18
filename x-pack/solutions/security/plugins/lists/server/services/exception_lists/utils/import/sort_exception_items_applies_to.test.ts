/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
  ImportExceptionListItemSchemaDecoded,
} from '@kbn/securitysolution-io-ts-list-types';

import { getImportExceptionsListItemSchemaDecodedMock } from '../../../../../common/schemas/request/import_exceptions_schema.mock';
import { getExceptionListSchemaMock } from '../../../../../common/schemas/response/exception_list_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../../../common/schemas/response/exception_list_item_schema.mock';

import { sortExceptionItemsToUpdateOrCreate } from './sort_exception_items_to_create_update';

jest.mock('uuid', () => ({
  v4: (): string => 'NEW_UUID',
}));

const esqlItem = (
  overrides: Partial<ImportExceptionListItemSchemaDecoded> = {}
): ImportExceptionListItemSchemaDecoded => ({
  ...getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1'),
  applies_to: 'esql_output_columns',
  entries: [
    {
      column_type: 'keyword',
      field: 'target_host',
      operator: 'included',
      type: 'match',
      value: 'dc-01',
    },
  ],
  os_types: [],
  ...overrides,
});

const lists = (
  type: 'rule_default' | 'detection' | 'endpoint_trusted_apps' = 'rule_default'
): Record<string, ExceptionListSchema> => ({
  'list-id-1': { ...getExceptionListSchemaMock(), list_id: 'list-id-1', type },
});

describe('importing the items that apply to the ES|QL output columns', () => {
  beforeEach(() =>
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2021-12-07T09:13:51.888Z')
  );
  afterAll(() => jest.restoreAllMocks());

  it('creates an item that applies to the ES|QL output columns', () => {
    const result = sortExceptionItemsToUpdateOrCreate({
      existingItems: {},
      existingLists: lists(),
      isOverwrite: false,
      items: [esqlItem()],
      user: 'elastic',
    });

    expect(result.errors).toEqual([]);
    expect(result.itemsToCreate).toHaveLength(1);
    expect(result.itemsToCreate[0].attributes).toEqual(
      expect.objectContaining({ applies_to: 'esql_output_columns', list_type: 'item' })
    );
  });

  it('reports an item that applies to the ES|QL output columns and is not valid, and goes on', () => {
    const result = sortExceptionItemsToUpdateOrCreate({
      existingItems: {},
      existingLists: lists(),
      isOverwrite: false,
      items: [
        esqlItem({
          entries: [
            {
              column_type: 'ip',
              field: 'src_ip',
              operator: 'included',
              type: 'match',
              value: 'bogus',
            },
          ],
        }),
        getImportExceptionsListItemSchemaDecodedMock('item-id-2', 'list-id-1'),
      ],
      user: 'elastic',
    });

    expect(result.errors).toEqual([
      {
        error: {
          message: expect.stringContaining('Invalid exception item with item_id: "item-id-1": '),
          status_code: 400,
        },
        item_id: 'item-id-1',
        list_id: 'list-id-1',
      },
    ]);
    expect(result.itemsToCreate).toHaveLength(1);
    expect(result.itemsToCreate[0].attributes.item_id).toBe('item-id-2');
  });

  it('reports every problem of an item', () => {
    const result = sortExceptionItemsToUpdateOrCreate({
      existingItems: {},
      existingLists: lists('endpoint_trusted_apps'),
      isOverwrite: false,
      items: [
        esqlItem({
          entries: [
            {
              column_type: 'ip',
              field: 'src_ip',
              operator: 'included',
              type: 'match',
              value: 'bogus',
            },
          ],
          os_types: ['linux'],
        }),
      ],
      user: 'elastic',
    });

    expect(result.itemsToCreate).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error.status_code).toBe(400);
    expect(result.errors[0].error.message).toContain('cannot have os_types');
    expect(result.errors[0].error.message).toContain('the type "endpoint_trusted_apps"');
    expect(result.errors[0].error.message).toContain(
      'value "bogus" is not valid for a column of type ip'
    );
  });

  it('reports a column_type in an item that applies to the source documents', () => {
    const result = sortExceptionItemsToUpdateOrCreate({
      existingItems: {},
      existingLists: lists(),
      isOverwrite: false,
      items: [esqlItem({ applies_to: undefined })],
      user: 'elastic',
    });

    expect(result.itemsToCreate).toEqual([]);
    expect(result.errors[0].error.message).toContain('column_type can only be set on the entries');
  });

  it('overwrites an item that applies to the ES|QL output columns with one that applies to the same', () => {
    const result = sortExceptionItemsToUpdateOrCreate({
      existingItems: {
        'item-id-1': getExceptionListItemSchemaMock({
          applies_to: 'esql_output_columns',
          id: 'existing-id',
          item_id: 'item-id-1',
          list_id: 'list-id-1',
        }),
      },
      existingLists: lists(),
      isOverwrite: true,
      items: [esqlItem()],
      user: 'elastic',
    });

    expect(result.errors).toEqual([]);
    expect(result.itemsToUpdate).toHaveLength(1);
    expect(result.itemsToUpdate[0].attributes).toEqual(
      expect.objectContaining({ applies_to: 'esql_output_columns' })
    );
  });

  it('does not overwrite an item with one that applies to something else', () => {
    const existing = (
      appliesTo?: 'esql_output_columns'
    ): Record<string, ExceptionListItemSchema> => ({
      'item-id-1': getExceptionListItemSchemaMock({
        applies_to: appliesTo,
        id: 'existing-id',
        item_id: 'item-id-1',
        list_id: 'list-id-1',
      }),
    });

    const toSource = sortExceptionItemsToUpdateOrCreate({
      existingItems: existing('esql_output_columns'),
      existingLists: lists(),
      isOverwrite: true,
      items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
      user: 'elastic',
    });
    expect(toSource.itemsToUpdate).toEqual([]);
    expect(toSource.errors[0].error.message).toContain(
      'it applies to "esql_output_columns" and cannot change to "source_documents"'
    );

    const toEsql = sortExceptionItemsToUpdateOrCreate({
      existingItems: existing(),
      existingLists: lists(),
      isOverwrite: true,
      items: [esqlItem()],
      user: 'elastic',
    });
    expect(toEsql.itemsToUpdate).toEqual([]);
    expect(toEsql.errors[0].error.message).toContain(
      'it applies to "source_documents" and cannot change to "esql_output_columns"'
    );
  });

  it('keeps importing the items that do not say what they apply to, with the feature off', () => {
    const result = sortExceptionItemsToUpdateOrCreate({
      existingItems: {},
      existingLists: lists('endpoint_trusted_apps'),
      isOverwrite: false,
      items: [getImportExceptionsListItemSchemaDecodedMock('item-id-1', 'list-id-1')],
      user: 'elastic',
    });

    expect(result.errors).toEqual([]);
    expect(result.itemsToCreate).toHaveLength(1);
  });
});
