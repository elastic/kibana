/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  ExceptionListItemSchema,
  ExceptionListSchema,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { exportExceptionListsAndItems } from './export_exception_lists_and_items';
import { findExceptionListsItemsPointInTimeFinder } from './find_exception_lists_items_point_in_time_finder';
import { findExceptionListPointInTimeFinder } from './find_exception_list_point_in_time_finder';

jest.mock('./find_exception_lists_items_point_in_time_finder');
jest.mock('./find_exception_list_point_in_time_finder');

const namespaceType: NamespaceType = 'single';

const baseOptions = {
  filter: undefined,
  includeExpiredExceptions: true,
  namespaceType,
  savedObjectsClient: savedObjectsClientMock.create(),
};

const mockListsFinder = (lists: ExceptionListSchema[]): void => {
  (findExceptionListPointInTimeFinder as jest.Mock).mockImplementationOnce(
    ({ executeFunctionOnStream }) => executeFunctionOnStream({ data: lists })
  );
};

const mockItemsFinder = (items: ExceptionListItemSchema[]): void => {
  (findExceptionListsItemsPointInTimeFinder as jest.Mock).mockImplementationOnce(
    ({ executeFunctionOnStream }) => executeFunctionOnStream({ data: items })
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('export_exception_lists_and_items', () => {
  describe('exportExceptionListsAndItems', () => {
    it('returns null when no exception lists are found', async () => {
      const result = await exportExceptionListsAndItems(baseOptions);

      expect(result).toEqual(null);
    });

    it('returns multiple exception lists and items when found', async () => {
      const exceptionList = getExceptionListSchemaMock();
      const exceptionListItem = getExceptionListItemSchemaMock();

      (findExceptionListPointInTimeFinder as jest.Mock).mockImplementationOnce(
        ({ executeFunctionOnStream }) => {
          executeFunctionOnStream({
            data: [getExceptionListSchemaMock(), getExceptionListSchemaMock()],
          });
        }
      );
      (findExceptionListsItemsPointInTimeFinder as jest.Mock).mockImplementationOnce(
        ({ executeFunctionOnStream }) => {
          executeFunctionOnStream({
            data: [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
          });
        }
      );

      const result = await exportExceptionListsAndItems(baseOptions);

      const parsedExportData =
        result?.exportData
          ?.trim()
          .split('\n')
          .map((item) => JSON.parse(item)) ?? [];

      expect(parsedExportData).toEqual([
        exceptionList,
        exceptionList,
        exceptionListItem,
        exceptionListItem,
      ]);

      expect(result?.exportDetails).toEqual(
        expect.objectContaining({
          exported_exception_list_count: 2,
          exported_exception_list_item_count: 2,
        })
      );
    });

    it('excludes expired exceptions when includeExpiredExceptions is false', async () => {
      mockListsFinder([getExceptionListSchemaMock()]);
      mockItemsFinder([]);

      await exportExceptionListsAndItems({
        ...baseOptions,
        includeExpiredExceptions: false,
      });

      expect(findExceptionListsItemsPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringMatching(
            /exception-list\.attributes\.expire_time > "[^"]+" OR NOT exception-list\.attributes\.expire_time: \*/
          ),
        })
      );
    });

    it('does not constrain item retrieval by expiration when includeExpiredExceptions is true', async () => {
      mockListsFinder([getExceptionListSchemaMock()]);
      mockItemsFinder([]);

      await exportExceptionListsAndItems({
        ...baseOptions,
        includeExpiredExceptions: true,
      });

      expect(findExceptionListsItemsPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: undefined,
        })
      );
    });

    it('only includes shared detection-type exception lists', async () => {
      // The positive `type: detection` filter implicitly excludes both
      // `endpoint*` (Defend) and `rule_default` (per-rule) exception lists,
      // which have their own dedicated export workflows.
      mockListsFinder([getExceptionListSchemaMock()]);
      mockItemsFinder([]);

      await exportExceptionListsAndItems(baseOptions);

      expect(findExceptionListPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('attributes.type: detection'),
        })
      );
    });

    it('combines the user-supplied filter with the detection-type filter', async () => {
      mockListsFinder([getExceptionListSchemaMock()]);
      mockItemsFinder([]);

      await exportExceptionListsAndItems({
        ...baseOptions,
        filter: 'exception-list.attributes.list_id: foo',
      });

      expect(findExceptionListPointInTimeFinder).toHaveBeenCalledWith(
        expect.objectContaining({
          filter:
            '(exception-list.attributes.list_id: foo) AND exception-list.attributes.type: detection',
        })
      );
    });

    describe('when exception list count exceeds the default export size limit', () => {
      it.todo('returns an error');
      it.todo('does not retrieve exception list items');
    });

    describe('when exception list + items count exceeds the default export size limit', () => {
      it.todo('returns an error');
    });
  });
});
