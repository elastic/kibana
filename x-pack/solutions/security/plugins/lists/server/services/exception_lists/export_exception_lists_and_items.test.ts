/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { exportExceptionListsAndItems } from './export_exception_lists_and_items';
import { findExceptionListItemsPointInTimeFinder } from './find_exception_list_items_point_in_time_finder';
import { findExceptionListPointInTimeFinder } from './find_exception_list_point_in_time_finder';

jest.mock('./find_exception_list_items_point_in_time_finder');
jest.mock('./find_exception_list_point_in_time_finder');

describe('export_exception_lists_and_items', () => {
  describe('exportExceptionListsAndItems', () => {
    it('returns null when no exception lists are found', async () => {
      const result = await exportExceptionListsAndItems({
        includeExpiredExceptions: true,
      });

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
      (findExceptionListItemsPointInTimeFinder as jest.Mock).mockImplementationOnce(
        ({ executeFunctionOnStream }) => {
          executeFunctionOnStream({
            data: [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
          });
        }
      );

      const result = await exportExceptionListsAndItems({
        includeExpiredExceptions: true,
      });

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

    it.todo('does not include expired exceptions by default');
    it.todo('does not include rule exception lists');

    describe('when exception list count exceeds the default export size limit', () => {
      it.todo('returns an error');
      it.todo('does not retrieve exception list items');
    });

    describe('when exception list + items count exceeds the default export size limit', () => {
      it.todo('returns an error');
    });
  });
});
