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

import type { PreDeleteListHook } from './bulk_delete_exception_list';
import { bulkDeleteExceptionList } from './bulk_delete_exception_list';
import { deleteExceptionListItemsByListStreamed } from './delete_exception_list_items_by_list';

jest.mock('./delete_exception_list_items_by_list');

const getListMock = (
  overrides: Partial<ReturnType<typeof getExceptionListSchemaMock>> = {}
): ReturnType<typeof getExceptionListSchemaMock> => ({
  ...getExceptionListSchemaMock(),
  namespace_type: 'single',
  type: 'detection',
  ...overrides,
});

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

  describe('core deletion', () => {
    test('deletes lists via bulkGet validation then per-list item cascade and container delete', async () => {
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
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.results).toEqual([list1, list2]);
      expect(result.errors).toEqual([]);
      expect(result.summary).toEqual({ failed: 0, skipped: 0, succeeded: 2, total: 2 });
      expect(callOrder.indexOf('delete items list-1')).toBeLessThan(
        callOrder.indexOf('delete container so-1')
      );
      expect(callOrder.indexOf('delete items list-2')).toBeLessThan(
        callOrder.indexOf('delete container so-2')
      );
    });

    test('reports 404 error for ids that bulkGet cannot find', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), notFoundSavedObject('so-2')],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1', 'so-2'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([list1]);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-2' }],
          message: 'exception list id: "so-2" does not exist',
          status_code: 404,
        },
      ]);
      expect(result.summary).toEqual({ failed: 1, skipped: 0, succeeded: 1, total: 2 });
    });

    test('reports 404 and does not delete when id belongs to an exception list item', async () => {
      const item = savedObjectFor(getListMock({ id: 'item-so-id', list_id: 'list-1' }));
      item.attributes.list_type = 'item';

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [item] });

      const result = await bulkDeleteExceptionList({
        ids: ['item-so-id'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'item-so-id' }],
          message: 'exception list id: "item-so-id" does not exist',
          status_code: 404,
        },
      ]);
      expect(result.summary).toEqual({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('preserves non-404 bulkGet errors', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [errorSavedObject('so-1', 403, 'forbidden')],
      });

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-1' }],
          message: 'forbidden',
          status_code: 403,
        },
      ]);
    });

    test('reports errors for all ids when none exist', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [notFoundSavedObject('fake-1'), notFoundSavedObject('fake-2')],
      });

      const result = await bulkDeleteExceptionList({
        ids: ['fake-1', 'fake-2'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].status_code).toBe(404);
      expect(result.errors[1].status_code).toBe(404);
      expect(result.summary).toEqual({ failed: 2, skipped: 0, succeeded: 0, total: 2 });
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('deduplicates ids and tracks skipped count', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1' });
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list)] });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1', 'so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'so-1', type: 'exception-list' },
      ]);
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.results).toEqual([list]);
      expect(result.summary).toEqual({ failed: 0, skipped: 1, succeeded: 1, total: 1 });
    });

    test('reports per-list error when item cascade fails, without affecting other lists', async () => {
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
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([list2]);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-1', list_id: 'list-1' }],
          message: 'boom',
          status_code: 500,
        },
      ]);
      expect(result.summary).toEqual({ failed: 1, skipped: 0, succeeded: 1, total: 2 });
    });

    test('reports per-list error when container delete fails', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list1)] });
      savedObjectsClient.delete.mockRejectedValue(
        Object.assign(new Error('conflict deleting object'), { statusCode: 409 })
      );
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-1', list_id: 'list-1' }],
          message: 'conflict deleting object',
          status_code: 409,
        },
      ]);
    });

    test('never runs more than the configured concurrency of list pipelines at once', async () => {
      const lists = Array.from({ length: 15 }, (_, index) =>
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
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(maxActive).toBeLessThanOrEqual(10);
    });

    test('returns empty success result when no ids provided', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();

      const result = await bulkDeleteExceptionList({
        ids: [],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result).toEqual({
        errors: [],
        results: [],
        success: true,
        summary: { failed: 0, skipped: 0, succeeded: 0, total: 0 },
      });
      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });
  });

  describe('pre-delete list hook', () => {
    test('is called once per found list with the transformed list', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });
      const list2 = getListMock({ id: 'so-2', list_id: 'list-2' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), savedObjectFor(list2), notFoundSavedObject('so-3')],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);
      const preDeleteListHook: jest.MockedFunction<PreDeleteListHook> = jest
        .fn()
        .mockResolvedValue([]);

      await bulkDeleteExceptionList({
        ids: ['so-1', 'so-2', 'so-3'],
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(preDeleteListHook).toHaveBeenCalledTimes(2);
      expect(preDeleteListHook).toHaveBeenCalledWith(list1);
      expect(preDeleteListHook).toHaveBeenCalledWith(list2);
    });

    test('blocks deletion with 409 and rule details when the hook returns one blocker', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1', name: 'My Detection List' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list)],
      });
      const preDeleteListHook: PreDeleteListHook = async () => [
        { id: 'rule-so-1', name: 'Malware Detection Rule', rule_id: 'rule-1' },
      ];

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-1', list_id: 'list-1' }],
          message:
            'Exception list "My Detection List" cannot be deleted because it is linked to 1 rule. Unlink the list from all rules before retrying.',
          rule_references: [{ id: 'rule-so-1', name: 'Malware Detection Rule', rule_id: 'rule-1' }],
          status_code: 409,
        },
      ]);
      expect(result.summary).toEqual({ failed: 1, skipped: 0, succeeded: 0, total: 1 });
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('blocks deletion with all rule details when the hook returns multiple blockers', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1', name: 'Shared List' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list)],
      });
      const preDeleteListHook: PreDeleteListHook = async () => [
        { id: 'rule-so-1', name: 'Rule A', rule_id: 'rule-1' },
        { id: 'rule-so-2', name: 'Rule B', rule_id: 'rule-2' },
        { id: 'rule-so-3', name: 'Rule C', rule_id: 'rule-3' },
      ];

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('linked to 3 rules');
      expect(result.errors[0].rule_references).toHaveLength(3);
      expect(result.errors[0].status_code).toBe(409);
    });

    test('partial failure: blocked lists get 409, unblocked lists are deleted', async () => {
      const linkedList = getListMock({
        id: 'so-linked',
        list_id: 'linked-list',
        name: 'Linked List',
      });
      const unlinkedList = getListMock({
        id: 'so-unlinked',
        list_id: 'unlinked-list',
        name: 'Unlinked List',
      });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(linkedList), savedObjectFor(unlinkedList)],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);
      const preDeleteListHook: PreDeleteListHook = async (list) =>
        list.id === 'so-linked' ? [{ id: 'rule-so-1', name: 'Some Rule', rule_id: 'rule-1' }] : [];

      const result = await bulkDeleteExceptionList({
        ids: ['so-linked', 'so-unlinked'],
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([unlinkedList]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].status_code).toBe(409);
      expect(result.errors[0].lists).toEqual([{ id: 'so-linked', list_id: 'linked-list' }]);
      expect(result.summary).toEqual({ failed: 1, skipped: 0, succeeded: 1, total: 2 });
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-unlinked');
    });

    test('reports a per-list error when the hook throws, without affecting other lists', async () => {
      const failingList = getListMock({ id: 'so-fail', list_id: 'fail-list' });
      const okList = getListMock({ id: 'so-ok', list_id: 'ok-list' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(failingList), savedObjectFor(okList)],
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);
      const preDeleteListHook: PreDeleteListHook = async (list) => {
        if (list.id === 'so-fail') {
          throw new Error('cannot verify rule references');
        }
        return [];
      };

      const result = await bulkDeleteExceptionList({
        ids: ['so-fail', 'so-ok'],
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([okList]);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-fail', list_id: 'fail-list' }],
          message: 'cannot verify rule references',
          status_code: 500,
        },
      ]);
      expect(result.summary).toEqual({ failed: 1, skipped: 0, succeeded: 1, total: 2 });
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-ok');
    });

    test('does not delete a list whose hook threw', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list)] });
      const preDeleteListHook: PreDeleteListHook = async () => {
        throw Object.assign(new Error('forbidden'), { statusCode: 403 });
      };

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        {
          lists: [{ id: 'so-1', list_id: 'list-1' }],
          message: 'forbidden',
          status_code: 403,
        },
      ]);
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('deletes every list without any check when no hook is provided', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list)] });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(true);
      expect(result.results).toEqual([list]);
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-1');
    });
  });

  describe('agnostic namespace', () => {
    test('resolves against the agnostic saved object type for bulkGet and delete', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1', namespace_type: 'agnostic' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list)] });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'agnostic',
        savedObjectsClient,
      });

      expect(result.success).toBe(true);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'so-1', type: 'exception-list-agnostic' },
      ]);
      expect(deleteExceptionListItemsByListStreamed).toHaveBeenCalledWith(
        expect.objectContaining({ namespaceType: 'agnostic' })
      );
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list-agnostic', 'so-1');
    });
  });

  describe('batch size', () => {
    test('deletes the full batch at the 100-list contractual maximum', async () => {
      const lists = Array.from({ length: 100 }, (_, index) =>
        getListMock({ id: `so-${index}`, list_id: `list-${index}` })
      );

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: lists.map((list) => savedObjectFor(list)),
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);
      const preDeleteListHook: jest.MockedFunction<PreDeleteListHook> = jest
        .fn()
        .mockResolvedValue([]);

      const result = await bulkDeleteExceptionList({
        ids: lists.map((list) => list.id),
        namespaceType: 'single',
        preDeleteListHook,
        savedObjectsClient,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(100);
      expect(result.summary).toEqual({ failed: 0, skipped: 0, succeeded: 100, total: 100 });
      expect(preDeleteListHook).toHaveBeenCalledTimes(100);
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(100);
      expect(deleteExceptionListItemsByListStreamed).toHaveBeenCalledTimes(100);
    });
  });
});
