/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createListItem, deleteListItem, findListItems, patchListItem } from '.';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import {
  getFoundListSchemaMock,
  getCreateListItemResponseMock,
  getUpdatedListItemResponseMock,
  getDeletedListItemResponseMock,
} from './mocks/response';

describe('Value list item API', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;
  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
  });

  describe('findListItems', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getFoundListSchemaMock());
    });

    it('GETs from the lists endpoint with query params', async () => {
      const abortCtrl = new AbortController();
      await findListItems({
        http: httpMock,
        pageIndex: 1,
        pageSize: 10,
        signal: abortCtrl.signal,
        filter: '*:*',
        listId: 'list_id',
        sortField: 'updated_at',
        sortOrder: 'asc',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            cursor: undefined,
            filter: '*:*',
            list_id: 'list_id',
            page: 1,
            per_page: 10,
            sort_field: 'updated_at',
            sort_order: 'asc',
          },
        })
      );
    });
  });

  describe('createListItem', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getCreateListItemResponseMock());
    });

    it('POSTs to the lists endpoint with the list item', async () => {
      const abortCtrl = new AbortController();
      await createListItem({
        http: httpMock,
        signal: abortCtrl.signal,
        value: '123',
        listId: 'list_id',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            value: '123',
            list_id: 'list_id',
          }),
        })
      );
    });

    it('returns the created list item', async () => {
      const abortCtrl = new AbortController();
      const result = await createListItem({
        http: httpMock,
        signal: abortCtrl.signal,
        value: '123',
        listId: 'list_id',
      });

      expect(result).toEqual(getCreateListItemResponseMock());
    });
  });

  describe('patchListItem', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getUpdatedListItemResponseMock());
    });

    it('PATCH to the lists endpoint with the list item', async () => {
      const abortCtrl = new AbortController();
      await patchListItem({
        http: httpMock,
        signal: abortCtrl.signal,
        id: 'item_id',
        value: '123',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            id: 'item_id',
            value: '123',
          }),
        })
      );
    });

    it('returns the updated list item', async () => {
      const abortCtrl = new AbortController();
      const result = await patchListItem({
        http: httpMock,
        signal: abortCtrl.signal,
        id: 'item_id',
        value: '123',
      });

      expect(result).toEqual(getUpdatedListItemResponseMock());
    });
  });

  describe('deleteListItem', () => {
    beforeEach(() => {
      httpMock.fetch.mockResolvedValue(getCreateListItemResponseMock());
    });

    it('DELETE to the lists endpoint with the list item', async () => {
      const abortCtrl = new AbortController();
      await deleteListItem({
        http: httpMock,
        signal: abortCtrl.signal,
        id: 'item_id',
        refresh: 'true',
      });

      expect(httpMock.fetch).toHaveBeenCalledWith(
        '/api/lists/items',
        expect.objectContaining({
          method: 'DELETE',
          query: { id: 'item_id', refresh: 'true' },
        })
      );
    });

    it('returns the deleted list item', async () => {
      const abortCtrl = new AbortController();
      const result = await deleteListItem({
        http: httpMock,
        signal: abortCtrl.signal,
        id: 'item_id',
      });

      expect(result).toEqual(getDeletedListItemResponseMock());
    });
  });
});
