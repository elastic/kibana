/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { withSpan } from '@kbn/apm-utils';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  ExceptionListSchema,
  Id,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { SavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';
import { getErrorMessageExceptionList } from '../../routes/utils/get_error_message_exception_list';
import type { ExceptionListPreDeleteListBlocker } from '../extension_points';

import { deleteExceptionListItemsByListStreamed } from './delete_exception_list_items_by_list';
import { transformSavedObjectToExceptionList } from './utils';

/**
 * Runs registered `exceptionsListPreDeleteList` extension points once for every list in the
 * batch and returns the lists whose deletion is refused. Throwing refuses every list.
 */
export type PreDeleteListHook = (
  lists: ExceptionListSchema[]
) => Promise<ExceptionListPreDeleteListBlocker[]>;

interface BulkDeleteExceptionListOptions {
  ids: Id[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  preDeleteListHook?: PreDeleteListHook;
}

export interface BulkDeleteExceptionListError {
  message: string;
  status_code: number;
  lists: Array<{ id: string; list_id?: string }>;
}

interface ListOperationResult {
  list: ExceptionListSchema;
  error?: BulkDeleteExceptionListError;
}

export interface BulkDeleteExceptionListResult {
  success: boolean;
  results: ExceptionListSchema[];
  errors: BulkDeleteExceptionListError[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

const BULK_DELETE_LIST_CONCURRENCY = 10;

/**
 * Validates data returned by an `exceptionsListPreDeleteList` extension point, so that a
 * malformed response refuses the whole batch instead of being read as "not referenced".
 */
export const validatePreDeleteListResponse = (
  listIds: string[],
  {
    lists,
    blockedLists,
  }: { lists: ExceptionListSchema[]; blockedLists: ExceptionListPreDeleteListBlocker[] }
): Error | undefined => {
  if (
    !Array.isArray(lists) ||
    lists.length !== listIds.length ||
    lists.some((list, index) => list?.id !== listIds[index])
  ) {
    return new Error('exceptionsListPreDeleteList extension changed the lists being processed');
  }

  if (!Array.isArray(blockedLists)) {
    return new Error('exceptionsListPreDeleteList extension returned a malformed [blockedLists]');
  }

  const requestedIds = new Set(listIds);
  const blockedIds = new Set<string>();

  for (const block of blockedLists) {
    if (typeof block?.id !== 'string' || !requestedIds.has(block.id) || blockedIds.has(block.id)) {
      return new Error(
        'exceptionsListPreDeleteList extension returned a malformed [blockedLists] entry'
      );
    }
    blockedIds.add(block.id);
  }

  return undefined;
};

const deleteListWithItems = async ({
  list,
  namespaceType,
  savedObjectsClient,
  savedObjectType,
}: {
  list: ExceptionListSchema;
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: SavedObjectType;
}): Promise<ListOperationResult> => {
  // Delete the container first so detection rules can no longer reference the
  // list. Orphaned items left behind by a subsequent cleanup failure are inert
  // (unreachable without a container) and preferable to a half-emptied list
  // that rules still execute against.
  try {
    await withSpan('exception_lists.bulk_delete.delete_container', async () =>
      savedObjectsClient.delete(savedObjectType, list.id)
    );
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: {
        lists: [{ id: list.id, list_id: list.list_id }],
        message,
        status_code: statusCode,
      },
      list,
    };
  }

  try {
    await withSpan('exception_lists.bulk_delete.delete_items', async () =>
      deleteExceptionListItemsByListStreamed({
        listId: list.list_id,
        namespaceType,
        savedObjectsClient,
      })
    );
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: {
        lists: [{ id: list.id, list_id: list.list_id }],
        message,
        status_code: statusCode,
      },
      list,
    };
  }

  return { list };
};

const checkPreDeleteListHook = async (
  lists: ExceptionListSchema[],
  preDeleteListHook: PreDeleteListHook
): Promise<{ deletableLists: ExceptionListSchema[]; refused: ListOperationResult[] }> => {
  let blockedLists: ExceptionListPreDeleteListBlocker[];

  try {
    blockedLists = await withSpan(
      {
        labels: { list_count: String(lists.length), strategy: 'aggregation' },
        name: 'exception_lists.bulk_delete.check_references',
      },
      async () => preDeleteListHook(lists)
    );
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      deletableLists: [],
      refused: lists.map((list) => ({
        error: {
          lists: [{ id: list.id, list_id: list.list_id }],
          message,
          status_code: statusCode,
        },
        list,
      })),
    };
  }

  const blockedListIds = new Set(blockedLists.map(({ id }) => id));
  const deletableLists: ExceptionListSchema[] = [];
  const refused: ListOperationResult[] = [];

  lists.forEach((list) => {
    if (!blockedListIds.has(list.id)) {
      deletableLists.push(list);
      return;
    }
    refused.push({
      error: {
        lists: [{ id: list.id, list_id: list.list_id }],
        message: `Exception list "${list.name}" cannot be deleted because it is referenced by one or more detection rules. Unlink the list from all rules before retrying.`,
        status_code: 409,
      },
      list,
    });
  });

  return { deletableLists, refused };
};

export const bulkDeleteExceptionList = async ({
  ids,
  namespaceType,
  savedObjectsClient,
  preDeleteListHook,
}: BulkDeleteExceptionListOptions): Promise<BulkDeleteExceptionListResult> => {
  const uniqueIds = [...new Set(ids)];
  const skippedCount = ids.length - uniqueIds.length;

  if (uniqueIds.length === 0) {
    return {
      errors: [],
      results: [],
      success: true,
      summary: { failed: 0, skipped: skippedCount, succeeded: 0, total: ids.length },
    };
  }

  const savedObjectType = getSavedObjectType({ namespaceType });

  const { saved_objects: savedObjects } = await withSpan(
    {
      labels: { list_count: String(uniqueIds.length) },
      name: 'exception_lists.bulk_delete.load_containers',
    },
    async () =>
      savedObjectsClient.bulkGet<ExceptionListSoSchema>(
        uniqueIds.map((id) => ({ id, type: savedObjectType }))
      )
  );

  const validationErrors: BulkDeleteExceptionListError[] = [];
  const foundLists: ExceptionListSchema[] = [];

  savedObjects.forEach((savedObject) => {
    const { id } = savedObject;
    if (isSavedObjectErrorResult(savedObject)) {
      validationErrors.push({
        lists: [{ id }],
        message:
          savedObject.error.statusCode === 404
            ? getErrorMessageExceptionList({ id, listId: undefined })
            : savedObject.error.message,
        status_code: savedObject.error.statusCode ?? 500,
      });
    } else if (savedObject.attributes.list_type !== 'list') {
      validationErrors.push({
        lists: [{ id }],
        message: `exception list id: "${id}" is not an exception list container`,
        status_code: 404,
      });
    } else {
      foundLists.push(transformSavedObjectToExceptionList({ savedObject }));
    }
  });

  const { deletableLists, refused } =
    preDeleteListHook && foundLists.length > 0
      ? await checkPreDeleteListHook(foundLists, preDeleteListHook)
      : { deletableLists: foundLists, refused: [] };

  const deleteResults = await pMap(
    deletableLists,
    (list) => deleteListWithItems({ list, namespaceType, savedObjectType, savedObjectsClient }),
    { concurrency: BULK_DELETE_LIST_CONCURRENCY }
  );

  const results: ExceptionListSchema[] = [];
  const deleteErrors: BulkDeleteExceptionListError[] = [];

  [...refused, ...deleteResults].forEach(({ list, error }) => {
    if (error) {
      deleteErrors.push(error);
    } else {
      results.push(list);
    }
  });

  const allErrors = [...validationErrors, ...deleteErrors];

  return {
    errors: allErrors,
    results,
    success: allErrors.length === 0,
    summary: {
      failed: allErrors.length,
      skipped: skippedCount,
      succeeded: results.length,
      total: ids.length,
    },
  };
};
