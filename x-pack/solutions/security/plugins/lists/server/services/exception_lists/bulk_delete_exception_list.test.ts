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
import { deleteExceptionListItemsByListStreamed } from './delete_exception_list_items_by_list';
import { resolveExceptionListIds } from './resolve_exception_list_ids';

jest.mock('./delete_exception_list_items_by_list');
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

const errorSavedObject = (
  id: string,
  statusCode: number,
  message: string
): SavedObject<ExceptionListSoSchema> =>
  ({
    error: { error: 'Saved object error', message, statusCode },
    id,
    type: 'exception-list',
  } as unknown as SavedObject<ExceptionListSoSchema>);

describe('bulkDeleteExceptionList', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('ids path', () => {
    test('it validates via a single bulkGet call, then deletes each list items followed by its container', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });
      const list2 = getListMock({ id: 'so-2', list_id: 'list-2' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), savedObjectFor(list2)],
      });
      const callOrder: string[] = [];
      savedObjectsClient.delete.mockImplementation(async (_type, id) => {
        callOrder.push(`delete container ${id}`);
        return {} as never;
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockImplementation(
        async ({ listId }) => {
          callOrder.push(`delete items ${listId}`);
        }
      );

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
      expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-1');
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-2');
      // Each list's items must be fully cascaded before that same list's container
      // is deleted, otherwise a slow item cascade racing a fast container delete
      // can leave orphaned items with no parent list to retry the cascade against.
      // Different lists may still interleave with each other (bounded concurrency).
      expect(callOrder.indexOf('delete items list-1')).toBeLessThan(
        callOrder.indexOf('delete container so-1')
      );
      expect(callOrder.indexOf('delete items list-2')).toBeLessThan(
        callOrder.indexOf('delete container so-2')
      );
    });

    test('it reports a 404 error for ids that bulkGet cannot find', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), notFoundSavedObject('so-2')],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

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

    test('it reports a 404 and does not delete when an id belongs to an exception list item', async () => {
      const item = savedObjectFor(getListMock({ id: 'item-so-id', list_id: 'list-1' }));
      item.attributes.list_type = 'item';

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [item] });

      const result = await bulkDeleteExceptionList({
        ids: ['item-so-id'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result).toEqual({
        deleted: [],
        errors: [
          {
            error: {
              message: 'exception list id: "item-so-id" does not exist',
              status_code: 404,
            },
            id: 'item-so-id',
            list_id: undefined,
          },
        ],
      });
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('it preserves non-404 bulkGet errors', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [errorSavedObject('so-1', 403, 'forbidden')],
      });

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.errors).toEqual([
        {
          error: { message: 'forbidden', status_code: 403 },
          id: 'so-1',
          list_id: undefined,
        },
      ]);
    });

    test('it deduplicates ids before resolving and deleting lists', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1' });
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list)] });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1', 'so-1'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'so-1', type: 'exception-list' },
      ]);
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: [list], errors: [] });
    });

    test('it reports a per-list error and skips the container delete when the item cascade fails for that list, without affecting other lists', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });
      const list2 = getListMock({ id: 'so-2', list_id: 'list-2' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), savedObjectFor(list2)],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockImplementation(
        async ({ listId }) => {
          if (listId === 'list-1') {
            throw new Error('boom');
          }
        }
      );

      const result = await bulkDeleteExceptionList({
        ids: ['so-1', 'so-2'],
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.deleted).toEqual([list2]);
      expect(result.errors).toEqual([
        {
          error: { message: 'boom', status_code: 500 },
          id: 'so-1',
          list_id: 'list-1',
        },
      ]);
      // The list whose item cascade failed must not have its container deleted.
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-2');
    });

    test('it reports a per-list error when the container delete fails for that list', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list1)] });
      savedObjectsClient.delete.mockRejectedValue(
        Object.assign(new Error('conflict deleting object'), { statusCode: 409 })
      );
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

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

    test('it never runs more than the configured concurrency of list pipelines at once', async () => {
      const lists = Array.from({ length: 6 }, (_, index) =>
        getListMock({ id: `so-${index}`, list_id: `list-${index}` })
      );

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: lists.map((list) => savedObjectFor(list)),
      });

      let active = 0;
      let maxActive = 0;
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockImplementation(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      });

      await bulkDeleteExceptionList({
        ids: lists.map((list) => list.id),
        listIds: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(maxActive).toBeLessThanOrEqual(10);
    });
  });

  describe('list_ids path', () => {
    test('it deletes lists resolved by resolveExceptionListIds, without ever calling bulkGet', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      (resolveExceptionListIds as jest.Mock).mockResolvedValue({
        listIds: [],
        lists: [list1],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const savedObjectsClient = savedObjectsClientMock.create();

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
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-1');
      expect(result.deleted).toEqual([list1]);
      expect(result.errors).toEqual([]);
    });

    test('it reports a 404 error for list_ids that fail to resolve, without calling bulkGet or deleting anything', async () => {
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
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('it does not delete anything or run the item cascade when every list_id fails to resolve', async () => {
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
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
    });

    test('it deduplicates list_ids before resolving and deleting lists', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1' });
      (resolveExceptionListIds as jest.Mock).mockResolvedValue({ listIds: [], lists: [list] });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);
      const savedObjectsClient = savedObjectsClientMock.create();

      const result = await bulkDeleteExceptionList({
        ids: [],
        listIds: ['list-1', 'list-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(resolveExceptionListIds).toHaveBeenCalledWith({
        listIds: ['list-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: [list], errors: [] });
    });
  });

  test('it does not call bulkGet, resolveExceptionListIds, or delete anything when no ids or list_ids are given', async () => {
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
    expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
  });
});
