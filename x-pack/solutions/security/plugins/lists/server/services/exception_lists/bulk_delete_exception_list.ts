/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
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
 * Runs registered `exceptionsListPreDeleteList` extension points for a single list and
 * returns the blockers that refuse its deletion. Throwing fails only the list being processed.
 */
export type PreDeleteListHook = (
  list: ExceptionListSchema
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
  rule_references?: Array<{ rule_id: string; id: string; name: string }>;
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
}): Promise<{ list: ExceptionListSchema; error?: BulkDeleteExceptionListError }> => {
  try {
    await deleteExceptionListItemsByListStreamed({
      listId: list.list_id,
      namespaceType,
      savedObjectsClient,
    });
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
    await savedObjectsClient.delete(savedObjectType, list.id);
    return { list };
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
};

const checkAndDeleteList = async ({
  list,
  namespaceType,
  preDeleteListHook,
  savedObjectsClient,
  savedObjectType,
}: {
  list: ExceptionListSchema;
  namespaceType: NamespaceType;
  preDeleteListHook?: PreDeleteListHook;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: SavedObjectType;
}): Promise<{ list: ExceptionListSchema; error?: BulkDeleteExceptionListError }> => {
  if (preDeleteListHook) {
    let blockedBy: ExceptionListPreDeleteListBlocker[];

    try {
      blockedBy = await preDeleteListHook(list);
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

    if (blockedBy.length > 0) {
      return {
        error: {
          lists: [{ id: list.id, list_id: list.list_id }],
          message: `Exception list "${list.name}" cannot be deleted because it is linked to ${
            blockedBy.length
          } ${
            blockedBy.length === 1 ? 'rule' : 'rules'
          }. Unlink the list from all rules before retrying.`,
          rule_references: blockedBy,
          status_code: 409,
        },
        list,
      };
    }
  }

  return deleteListWithItems({ list, namespaceType, savedObjectType, savedObjectsClient });
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
      summary: { failed: 0, skipped: skippedCount, succeeded: 0, total: 0 },
    };
  }

  const savedObjectType = getSavedObjectType({ namespaceType });

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet<ExceptionListSoSchema>(
    uniqueIds.map((id) => ({ id, type: savedObjectType }))
  );

  const validationErrors: BulkDeleteExceptionListError[] = [];
  const foundLists: ExceptionListSchema[] = [];

  savedObjects.forEach((savedObject, index) => {
    const id = uniqueIds[index];
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
        message: getErrorMessageExceptionList({ id, listId: undefined }),
        status_code: 404,
      });
    } else {
      foundLists.push(transformSavedObjectToExceptionList({ savedObject }));
    }
  });

  const deleteResults =
    foundLists.length > 0
      ? await pMap(
          foundLists,
          (list) =>
            checkAndDeleteList({
              list,
              namespaceType,
              preDeleteListHook,
              savedObjectType,
              savedObjectsClient,
            }),
          { concurrency: BULK_DELETE_LIST_CONCURRENCY }
        )
      : [];

  const results: ExceptionListSchema[] = [];
  const deleteErrors: BulkDeleteExceptionListError[] = [];

  deleteResults.forEach(({ list, error }) => {
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
      total: uniqueIds.length,
    },
  };
};
