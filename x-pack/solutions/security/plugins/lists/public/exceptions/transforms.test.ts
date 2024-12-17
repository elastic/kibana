/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateExceptionListItemSchema,
  Entry,
  EntryMatch,
  EntryNested,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  addIdToExceptionItemEntries,
  removeIdFromExceptionItemsEntries,
  transformInput,
  transformOutput,
} from '@kbn/securitysolution-list-hooks';

import { getCreateExceptionListItemSchemaMock } from '../../common/schemas/request/create_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../common/schemas/request/update_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../common/schemas/response/exception_list_item_schema.mock';
import { ENTRIES_WITH_IDS } from '../../common/constants.mock';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

// TODO: Once mocks are figured out, move this test to the kbn package of: kbn-securitysolution-list-hooks/src/transforms/index.test.ts

describe('Exceptions transforms', () => {
  describe('transformOutput', () => {
    it('returns same output as input with stripped ids per entry - CreateExceptionListItemSchema', () => {
      const mockCreateExceptionItem = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };
      const output = transformOutput(mockCreateExceptionItem);
      const expectedOutput: CreateExceptionListItemSchema = getCreateExceptionListItemSchemaMock();

      expect(output).toEqual(expectedOutput);
    });

    it('returns same output as input with stripped ids per entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };
      const output = transformOutput(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = getUpdateExceptionListItemSchemaMock();

      expect(output).toEqual(expectedOutput);
    });
  });

  describe('transformInput', () => {
    it('returns same output as input with added ids per entry', () => {
      const mockExceptionItem = getExceptionListItemSchemaMock();
      const output = transformInput(mockExceptionItem);
      const expectedOutput: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };

      expect(output).toEqual(expectedOutput);
    });
  });

  describe('addIdToExceptionItemEntries', () => {
    it('returns same output as input with added ids per entry', () => {
      const mockExceptionItem: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
      };
      const output = addIdToExceptionItemEntries(mockExceptionItem);
      const expectedOutput: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: 'included',
            type: 'match',
            value: 'some value',
          } as Entry & { id: string },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('returns same output as input with added ids per nested entry', () => {
      const mockExceptionItem: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      };
      const output = addIdToExceptionItemEntries(mockExceptionItem);
      const expectedOutput: ExceptionListItemSchema = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                id: '123',
                operator: 'included',
                type: 'match',
                value: 'some value',
              } as EntryMatch & { id: string },
            ],
            field: 'some.parentField',
            id: '123',
            type: 'nested',
          } as EntryNested & { id: string },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });
  });

  describe('removeIdFromExceptionItemsEntries', () => {
    it('returns same output as input with stripped ids per entry - CreateExceptionListItemSchema', () => {
      const mockCreateExceptionItem = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: 'included',
            type: 'match',
            value: 'some value',
          } as Entry & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockCreateExceptionItem);
      const expectedOutput: CreateExceptionListItemSchema = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('returns same output as input with stripped ids per nested entry - CreateExceptionListItemSchema', () => {
      const mockCreateExceptionItem = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                id: '123',
                operator: 'included',
                type: 'match',
                value: 'some value',
              } as EntryMatch & { id: string },
            ],
            field: 'some.parentField',
            id: '123',
            type: 'nested',
          } as EntryNested & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockCreateExceptionItem);
      const expectedOutput: CreateExceptionListItemSchema = {
        ...getCreateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('returns same output as input with stripped ids per entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            id: '123',
            operator: 'included',
            type: 'match',
            value: 'some value',
          } as Entry & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });

    it('returns same output as input with stripped ids per nested entry - UpdateExceptionListItemSchema', () => {
      const mockUpdateExceptionItem = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                id: '123',
                operator: 'included',
                type: 'match',
                value: 'some value',
              } as EntryMatch & { id: string },
            ],
            field: 'some.parentField',
            id: '123',
            type: 'nested',
          } as EntryNested & { id: string },
        ],
      };
      const output = removeIdFromExceptionItemsEntries(mockUpdateExceptionItem);
      const expectedOutput: UpdateExceptionListItemSchema = {
        ...getUpdateExceptionListItemSchemaMock(),
        entries: [
          {
            entries: [
              {
                field: 'nested.field',
                operator: 'included',
                type: 'match',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
        ],
      };

      expect(output).toEqual(expectedOutput);
    });
  });
});
