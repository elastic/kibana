/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';

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

const emptyFindResponse: SavedObjectsFindResponse = {
  saved_objects: [],
  total: 0,
  per_page: 10000,
  page: 1,
};

const ruleSavedObject = ({
  ruleId,
  soId,
  name,
  referencedListIds,
}: {
  ruleId: string;
  soId: string;
  name: string;
  referencedListIds: string[];
}) => ({
  id: soId,
  type: 'alert',
  attributes: { name, params: { ruleId } },
  references: referencedListIds.map((listId, index) => ({
    name: `param:exceptionsList_${index}`,
    id: listId,
    type: 'exception-list',
  })),
  score: 0,
});

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
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
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
      expect(result.summary).toEqual({ total: 2, succeeded: 2, failed: 0, skipped: 0 });
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
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
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
          message: 'exception list id: "so-2" does not exist',
          status_code: 404,
          lists: [{ id: 'so-2' }],
        },
      ]);
      expect(result.summary).toEqual({ total: 2, succeeded: 1, failed: 1, skipped: 0 });
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
          message: 'exception list id: "item-so-id" does not exist',
          status_code: 404,
          lists: [{ id: 'item-so-id' }],
        },
      ]);
      expect(result.summary).toEqual({ total: 1, succeeded: 0, failed: 1, skipped: 0 });
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
          message: 'forbidden',
          status_code: 403,
          lists: [{ id: 'so-1' }],
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
      expect(result.summary).toEqual({ total: 2, succeeded: 0, failed: 2, skipped: 0 });
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('deduplicates ids and tracks skipped count', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1' });
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list)] });
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
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
      expect(result.summary).toEqual({ total: 1, succeeded: 1, failed: 0, skipped: 1 });
    });

    test('reports per-list error when item cascade fails, without affecting other lists', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });
      const list2 = getListMock({ id: 'so-2', list_id: 'list-2' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), savedObjectFor(list2)],
      });
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
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
          message: 'boom',
          status_code: 500,
          lists: [{ id: 'so-1', list_id: 'list-1' }],
        },
      ]);
      expect(result.summary).toEqual({ total: 2, succeeded: 1, failed: 1, skipped: 0 });
    });

    test('reports per-list error when container delete fails', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [savedObjectFor(list1)] });
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
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
          message: 'conflict deleting object',
          status_code: 409,
          lists: [{ id: 'so-1', list_id: 'list-1' }],
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
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);

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
        success: true,
        results: [],
        errors: [],
        summary: { total: 0, succeeded: 0, failed: 0, skipped: 0 },
      });
      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
      expect(savedObjectsClient.find).not.toHaveBeenCalled();
    });
  });

  describe('rule reference checking', () => {
    test('blocks deletion of list linked to one rule with 409 and rule details', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1', name: 'My Detection List' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list)],
      });
      savedObjectsClient.find.mockResolvedValue({
        ...emptyFindResponse,
        total: 1,
        saved_objects: [
          ruleSavedObject({
            ruleId: 'rule-1',
            soId: 'rule-so-1',
            name: 'Malware Detection Rule',
            referencedListIds: ['so-1'],
          }),
        ],
      } as SavedObjectsFindResponse);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.errors).toEqual([
        {
          message:
            'Exception list "My Detection List" cannot be deleted because it is linked to 1 rule. Unlink the list from all rules before retrying.',
          status_code: 409,
          lists: [{ id: 'so-1', list_id: 'list-1' }],
          rule_references: [{ rule_id: 'rule-1', id: 'rule-so-1', name: 'Malware Detection Rule' }],
        },
      ]);
      expect(result.summary).toEqual({ total: 1, succeeded: 0, failed: 1, skipped: 0 });
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
    });

    test('blocks deletion of list linked to multiple rules with all rule details', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1', name: 'Shared List' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list)],
      });
      savedObjectsClient.find.mockResolvedValue({
        ...emptyFindResponse,
        total: 3,
        saved_objects: [
          ruleSavedObject({
            ruleId: 'rule-1',
            soId: 'rule-so-1',
            name: 'Rule A',
            referencedListIds: ['so-1'],
          }),
          ruleSavedObject({
            ruleId: 'rule-2',
            soId: 'rule-so-2',
            name: 'Rule B',
            referencedListIds: ['so-1'],
          }),
          ruleSavedObject({
            ruleId: 'rule-3',
            soId: 'rule-so-3',
            name: 'Rule C',
            referencedListIds: ['so-1'],
          }),
        ],
      } as SavedObjectsFindResponse);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('linked to 3 rules');
      expect(result.errors[0].rule_references).toHaveLength(3);
      expect(result.errors[0].status_code).toBe(409);
    });

    test('skips rule reference check for endpoint-type lists and deletes them normally', async () => {
      const endpointList = getListMock({
        id: 'so-1',
        list_id: 'endpoint-list-1',
        type: 'endpoint',
      });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(endpointList)],
      });
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(true);
      expect(result.results).toEqual([endpointList]);
      // find() should not be called since there are no non-endpoint lists to check
      expect(savedObjectsClient.find).not.toHaveBeenCalled();
    });

    test('skips rule reference check for all endpoint artifact types', async () => {
      const endpointTypes = [
        'endpoint',
        'endpoint_trusted_apps',
        'endpoint_trusted_devices',
        'endpoint_events',
        'endpoint_host_isolation_exceptions',
        'endpoint_blocklists',
        'endpoint_custom_yara_signatures',
      ];
      const lists = endpointTypes.map((type, index) =>
        getListMock({ id: `so-${index}`, list_id: `list-${index}`, type: type as 'endpoint' })
      );

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: lists.map((list) => savedObjectFor(list)),
      });
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: lists.map((l) => l.id),
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(7);
      expect(savedObjectsClient.find).not.toHaveBeenCalled();
    });

    test('partial failure: linked lists blocked, unlinked lists deleted', async () => {
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
      savedObjectsClient.find.mockResolvedValue({
        ...emptyFindResponse,
        total: 1,
        saved_objects: [
          ruleSavedObject({
            ruleId: 'rule-1',
            soId: 'rule-so-1',
            name: 'Some Rule',
            referencedListIds: ['so-linked'],
          }),
        ],
      } as SavedObjectsFindResponse);
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-linked', 'so-unlinked'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.results).toEqual([unlinkedList]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].status_code).toBe(409);
      expect(result.errors[0].lists).toEqual([{ id: 'so-linked', list_id: 'linked-list' }]);
      expect(result.summary).toEqual({ total: 2, succeeded: 1, failed: 1, skipped: 0 });
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('exception-list', 'so-unlinked');
    });

    test('rule_default list linked to its owning rule is blocked with 409', async () => {
      const ruleDefaultList = getListMock({
        id: 'so-rd',
        list_id: 'rd-list-1',
        name: 'Rule Default List',
        type: 'rule_default',
      });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(ruleDefaultList)],
      });
      savedObjectsClient.find.mockResolvedValue({
        ...emptyFindResponse,
        total: 1,
        saved_objects: [
          ruleSavedObject({
            ruleId: 'owning-rule',
            soId: 'owning-rule-so',
            name: 'Owner Rule',
            referencedListIds: ['so-rd'],
          }),
        ],
      } as SavedObjectsFindResponse);

      const result = await bulkDeleteExceptionList({
        ids: ['so-rd'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0].status_code).toBe(409);
      expect(result.errors[0].rule_references).toEqual([
        { rule_id: 'owning-rule', id: 'owning-rule-so', name: 'Owner Rule' },
      ]);
      expect(deleteExceptionListItemsByListStreamed).not.toHaveBeenCalled();
    });

    test('uses single find() query with hasReference OR for multiple lists', async () => {
      const list1 = getListMock({ id: 'so-1', list_id: 'list-1' });
      const list2 = getListMock({ id: 'so-2', list_id: 'list-2' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list1), savedObjectFor(list2)],
      });
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      await bulkDeleteExceptionList({
        ids: ['so-1', 'so-2'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'alert',
          hasReference: [
            { type: 'exception-list', id: 'so-1' },
            { type: 'exception-list', id: 'so-2' },
          ],
          hasReferenceOperator: 'OR',
        })
      );
    });

    test('mixed endpoint and detection lists: only detection lists checked for references', async () => {
      const endpointList = getListMock({
        id: 'so-ep',
        list_id: 'ep-list',
        type: 'endpoint',
      });
      const detectionList = getListMock({
        id: 'so-det',
        list_id: 'det-list',
        type: 'detection',
      });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(endpointList), savedObjectFor(detectionList)],
      });
      savedObjectsClient.find.mockResolvedValue(emptyFindResponse);
      (deleteExceptionListItemsByListStreamed as jest.Mock).mockResolvedValue(undefined);

      const result = await bulkDeleteExceptionList({
        ids: ['so-ep', 'so-det'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(savedObjectsClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          hasReference: [{ type: 'exception-list', id: 'so-det' }],
        })
      );
    });

    test('falls back to SO id as rule_id when params.ruleId is missing', async () => {
      const list = getListMock({ id: 'so-1', list_id: 'list-1', name: 'Test List' });

      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [savedObjectFor(list)],
      });
      savedObjectsClient.find.mockResolvedValue({
        ...emptyFindResponse,
        total: 1,
        saved_objects: [
          {
            id: 'rule-so-1',
            type: 'alert',
            attributes: { name: 'Non-Detection Rule', params: {} },
            references: [{ name: 'param:exceptionsList_0', id: 'so-1', type: 'exception-list' }],
            score: 0,
          },
        ],
      } as SavedObjectsFindResponse);

      const result = await bulkDeleteExceptionList({
        ids: ['so-1'],
        namespaceType: 'single',
        savedObjectsClient,
      });

      expect(result.errors[0].rule_references).toEqual([
        { rule_id: 'rule-so-1', id: 'rule-so-1', name: 'Non-Detection Rule' },
      ]);
    });
  });
});
