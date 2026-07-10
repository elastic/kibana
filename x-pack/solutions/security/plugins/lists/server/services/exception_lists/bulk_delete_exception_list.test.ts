/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

import { bulkDeleteExceptionList } from './bulk_delete_exception_list';
import { getExceptionListItemIds } from './delete_exception_list_items_by_list';
import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';
import { resolveExceptionListIds } from './resolve_exception_list_ids';

jest.mock('./delete_exception_list_items_by_list');
jest.mock('./bulk_delete_exception_list_items');
jest.mock('./resolve_exception_list_ids');

const getListMock = (
  overrides: Partial<ReturnType<typeof getExceptionListSchemaMock>> = {}
): ReturnType<typeof getExceptionListSchemaMock> => ({
  ...getExceptionListSchemaMock(),
  namespace_type: 'single',
  ...overrides,
});

// Mirrors the round trip performed by transformSavedObjectToExceptionList: _version and
// updated_at come from the top-level saved object, not its attributes, and namespace_type
// is derived from the saved object type rather than stored directly.
const savedObjectFor = (
  list: ReturnType<typeof getExceptionListSchemaMock>
): SavedObject<ExceptionListSoSchema> =>
  ({
    attributes: {
      created_at: list.created_at,
      created_by: list.created_by,
      description: list.description,
      immutable: list.immutable,
      list_id: list.list_id,
      list_type: 'list',
      meta: list.meta,
      name: list.name,
      os_types: list.os_types,
      tags: list.tags,
      tie_breaker_id: list.tie_breaker_id,
      type: list.type,
      updated_by: list.updated_by,
      version: list.version,
    },
    id: list.id,
    references: [],
    type: 'exception-list',
    updated_at: list.updated_at,
    version: list._version,
  } as unknown as SavedObject<ExceptionListSoSchema>);

const notFoundSavedObject = (id: string): SavedObject<ExceptionListSoSchema> =>
  ({
    error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
    id,
    type: 'exception-list',
  } as unknown as SavedObject<ExceptionListSoSchema>);

describe('bulkDeleteExceptionList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ids path', () => {
    test('it validates and deletes ids via a single bulkGet call, without resolving any list_ids', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });
      const list2 = getListMock({ id: 'so-2', list_id: 'list-2' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), savedObjectFor(list2)],
      });
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'so-1', success: true, type: 'exception-list' },
          { id: 'so-2', success: true, type: 'exception-list' },
        ],
      });
      (getExceptionListItemIds as jest.Mock)
        .mockResolvedValueOnce(['item-1', 'item-2'])
        .mockResolvedValueOnce(['item-3']);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1', 'so-2'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(resolveExceptionListIds).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'so-1', type: 'exception-list' },
        { id: 'so-2', type: 'exception-list' },
      ]);
      expect(result.deleted).toEqual([list1, list2]);
      expect(result.errors).toEqual([]);
      expect(bulkDeleteExceptionListItems).toHaveBeenCalledTimes(1);
      expect(bulkDeleteExceptionListItems).toHaveBeenCalledWith({
        ids: ['item-1', 'item-2', 'item-3'],
        namespaceType: 'single',
        savedObjectsClient,
      });
      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: 'so-1', type: 'exception-list' },
        { id: 'so-2', type: 'exception-list' },
      ]);
    });

    test('it reports a 404 error for ids that bulkGet cannot find', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), notFoundSavedObject('so-2')],
      });
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [{ id: 'so-1', success: true, type: 'exception-list' }],
      });
      (getExceptionListItemIds as jest.Mock).mockResolvedValueOnce([]);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1', 'so-2'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.deleted).toEqual([list1]);
      expect(result.errors).toEqual([
        {
          error: { message: 'exception list id: "so-2" does not exist', status_code: 404 },
          id: 'so-2',
          list_id: undefined,
        },
      ]);
    });

    test('it reports a per-list error when the saved objects bulkDelete call fails for that list', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list1)] });
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            error: { error: 'Conflict', message: 'conflict deleting object', statusCode: 409 },
            id: 'so-1',
            success: false,
            type: 'exception-list',
          },
        ],
      });
      (getExceptionListItemIds as jest.Mock).mockResolvedValueOnce([]);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.deleted).toEqual([]);
      expect(result.errors).toEqual([
        {
          error: { message: 'conflict deleting object', status_code: 409 },
          id: 'so-1',
          list_id: 'list-1',
        },
      ]);
    });
  });

  describe('list_ids path', () => {
    test('it deletes lists resolved by resolveExceptionListIds, without ever calling bulkGet', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      (resolveExceptionListIds as jest.Mock).mockResolvedValue({
        listIds: [],
        lists: [list1],
      });
      (getExceptionListItemIds as jest.Mock).mockResolvedValueOnce([]);

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [{ id: 'so-1', success: true, type: 'exception-list' }],
      });

      const result = await bulkDeleteExceptionList({
        ids: [],
        listIds: ['list-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(resolveExceptionListIds).toHaveBeenCalledWith({
        listIds: ['list-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });
      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
      expect(result.deleted).toEqual([list1]);
      expect(result.errors).toEqual([]);
    });

    test('it reports a 404 error for list_ids that fail to resolve, without calling bulkGet or bulkDelete', async () => {
      (resolveExceptionListIds as jest.Mock).mockResolvedValue({
        listIds: ['missing-list'],
        lists: [],
      });

      const savedObjectsClient = savedObjectsClientMock.create();

      const result = await bulkDeleteExceptionList({
        ids: [],
        listIds: ['missing-list'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.deleted).toEqual([]);
      expect(result.errors).toEqual([
        {
          error: {
            message: 'exception list list_id: "missing-list" does not exist',
            status_code: 404,
          },
          id: undefined,
          list_id: 'missing-list',
        },
      ]);
      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
      expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    });

    test('it does not call bulkDelete or the item cascade when every list_id fails to resolve', async () => {
      (resolveExceptionListIds as jest.Mock).mockResolvedValue({
        listIds: ['missing-1', 'missing-2'],
        lists: [],
      });

      const savedObjectsClient = savedObjectsClientMock.create();

      const result = await bulkDeleteExceptionList({
        ids: [],
        listIds: ['missing-1', 'missing-2'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.deleted).toEqual([]);
      expect(result.errors).toHaveLength(2);
      expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(getExceptionListItemIds).not.toHaveBeenCalled();
    });
  });

  test('it does not call bulkGet, resolveExceptionListIds, or bulkDelete when no ids or list_ids are given', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();

    const result = await bulkDeleteExceptionList({
      ids: [],
      listIds: [],
      namespaceType: 'single',
      savedObjectsClient,
    });

    expect(result).toEqual({
      deleted: [],
      errors: [
        {
          error: { message: 'No ids or lists id provided', status_code: 400 },
          id: undefined,
          list_id: undefined,
        },
      ],
    });
    expect(resolveExceptionListIds).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    expect(getExceptionListItemIds).not.toHaveBeenCalled();
  });
});
