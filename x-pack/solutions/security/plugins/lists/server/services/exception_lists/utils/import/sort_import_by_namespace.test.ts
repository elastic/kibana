/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getImportExceptionsListItemSchemaDecodedMock,
  getImportExceptionsListSchemaDecodedMock,
} from '../../../../../common/schemas/request/import_exceptions_schema.mock';

import {
  sortItemsImportsByNamespace,
  sortListsImportsByNamespace,
} from './sort_import_by_namespace';

describe('sort_import_by_namespace', () => {
  describe('sortListsImportsByNamespace', () => {
    it('returns empty arrays if no lists to sort', () => {
      const result = sortListsImportsByNamespace([]);

      expect(result).toEqual([[], []]);
    });

    it('sorts lists by namespace', () => {
      const result = sortListsImportsByNamespace([
        { ...getImportExceptionsListSchemaDecodedMock('list-id-1'), namespace_type: 'single' },
        { ...getImportExceptionsListSchemaDecodedMock('list-id-2'), namespace_type: 'agnostic' },
        { ...getImportExceptionsListSchemaDecodedMock('list-id-3'), namespace_type: 'single' },
        { ...getImportExceptionsListSchemaDecodedMock('list-id-4'), namespace_type: 'single' },
      ]);

      expect(result).toEqual([
        [{ ...getImportExceptionsListSchemaDecodedMock('list-id-2'), namespace_type: 'agnostic' }],
        [
          { ...getImportExceptionsListSchemaDecodedMock('list-id-1'), namespace_type: 'single' },
          { ...getImportExceptionsListSchemaDecodedMock('list-id-3'), namespace_type: 'single' },
          { ...getImportExceptionsListSchemaDecodedMock('list-id-4'), namespace_type: 'single' },
        ],
      ]);
    });
  });

  describe('sortItemsImportsByNamespace', () => {
    it('returns empty arrays if no items to sort', () => {
      const result = sortItemsImportsByNamespace([]);

      expect(result).toEqual([[], []]);
    });

    it('sorts lists by namespace', () => {
      const result = sortItemsImportsByNamespace([
        { ...getImportExceptionsListItemSchemaDecodedMock('item-id-1'), namespace_type: 'single' },
        {
          ...getImportExceptionsListItemSchemaDecodedMock('item-id-2'),
          namespace_type: 'agnostic',
        },
        { ...getImportExceptionsListItemSchemaDecodedMock('item-id-3'), namespace_type: 'single' },
        { ...getImportExceptionsListItemSchemaDecodedMock('item-id-4'), namespace_type: 'single' },
      ]);

      expect(result).toEqual([
        [
          {
            ...getImportExceptionsListItemSchemaDecodedMock('item-id-2'),
            namespace_type: 'agnostic',
          },
        ],
        [
          {
            ...getImportExceptionsListItemSchemaDecodedMock('item-id-1'),
            namespace_type: 'single',
          },
          {
            ...getImportExceptionsListItemSchemaDecodedMock('item-id-3'),
            namespace_type: 'single',
          },
          {
            ...getImportExceptionsListItemSchemaDecodedMock('item-id-4'),
            namespace_type: 'single',
          },
        ],
      ]);
    });
  });
});
