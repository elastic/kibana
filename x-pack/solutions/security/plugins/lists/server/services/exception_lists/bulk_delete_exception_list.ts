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
  IdOrUndefined,
  ListId,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { SavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';
import { getErrorMessageExceptionList } from '../../routes/utils/get_error_message_exception_list';

import { deleteExceptionListItemsByListStreamed } from './delete_exception_list_items_by_list';
import { resolveExceptionListIds } from './resolve_exception_list_ids';
import { transformSavedObjectToExceptionList } from './utils';

interface BulkDeleteExceptionListOptions {
  ids: Id[];
  listIds: ListId[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
}

export interface BulkDeleteExceptionListError {
  id: IdOrUndefined;
  list_id: ListIdOrUndefined;
  error: {
    message: string;
    status_code: number;
  };
}

export interface BulkDeleteExceptionListResult {
  deleted: ExceptionListSchema[];
  errors: BulkDeleteExceptionListError[];
}

// Caps how many lists have their item-cascade + container delete running at
// once. Each list's item cascade can itself involve several sequential PIT
// pages, so fanning out to all lists in a batch (up to 100) at once would be
// an unbounded burst of concurrent ES load; a small, fixed concurrency keeps
// that bounded regardless of batch size.
const BULK_DELETE_LIST_CONCURRENCY = 10;

interface DeleteListWithItemsResult {
  list: ExceptionListSchema;
  error?: BulkDeleteExceptionListError;
}

/**
 * Deletes a single list end-to-end: its items first, then the list container
 * itself, mirroring the sequential order of the existing single-delete path
 * (deleteExceptionList: items first, then the list). Deleting the container
 * first would risk orphaned items that can never be cleaned up, since
 * list_id no longer resolves to anything once the list is gone.
 *
 * Each list is handled as an independent unit: an error deleting one list's
 * items or container is reported back as that list's error and does not
 * affect any other list in the batch.
 */
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
}): Promise<DeleteListWithItemsResult> => {
  try {
    await deleteExceptionListItemsByListStreamed({
      listId: list.list_id,
      namespaceType,
      savedObjectsClient,
    });
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: { error: { message, status_code: statusCode }, id: list.id, list_id: list.list_id },
      list,
    };
  }

  try {
    await savedObjectsClient.delete(savedObjectType, list.id);
    return { list };
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: { error: { message, status_code: statusCode }, id: list.id, list_id: list.list_id },
      list,
    };
  }
};

const deleteListsWithItems = async ({
  foundLists,
  namespaceType,
  savedObjectsClient,
  savedObjectType,
}: {
  foundLists: ExceptionListSchema[];
  namespaceType: NamespaceType;
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectType: SavedObjectType;
}): Promise<BulkDeleteExceptionListResult> => {
  const results = await pMap(
    foundLists,
    (list) => deleteListWithItems({ list, namespaceType, savedObjectType, savedObjectsClient }),
    { concurrency: BULK_DELETE_LIST_CONCURRENCY }
  );

  const deleted: ExceptionListSchema[] = [];
  const deleteErrors: BulkDeleteExceptionListError[] = [];

  results.forEach(({ list, error }) => {
    if (error) {
      deleteErrors.push(error);
    } else {
      deleted.push(list);
    }
  });

  return { deleted, errors: deleteErrors };
};

/**
 * Full, self-contained pipeline for bulk-deleting lists identified by saved
 * object id: validate existence via a single bulkGet call, then delete each
 * found list (items, then container) as an independent, concurrency-limited
 * unit.
 */
const bulkDeleteExceptionListsByIds = async ({
  ids,
  namespaceType,
  savedObjectsClient,
}: Omit<BulkDeleteExceptionListOptions, 'listIds'>): Promise<BulkDeleteExceptionListResult> => {
  const savedObjectType = getSavedObjectType({ namespaceType });

  // Validates that the exception list exists all at once via bulkGet
  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet<ExceptionListSoSchema>(
    ids.map((id) => ({ id, type: savedObjectType }))
  );

  const notFoundErrors: BulkDeleteExceptionListError[] = [];
  const foundLists: ExceptionListSchema[] = [];

  savedObjects.forEach((savedObject, index) => {
    if (isSavedObjectErrorResult(savedObject)) {
      const id = ids[index];
      notFoundErrors.push({
        error: {
          message:
            savedObject.error.statusCode === 404
              ? getErrorMessageExceptionList({ id, listId: undefined })
              : savedObject.error.message,
          status_code: savedObject.error.statusCode ?? 500,
        },
        id,
        list_id: undefined,
      });
    } else if (savedObject.attributes.list_type !== 'list') {
      const id = ids[index];
      notFoundErrors.push({
        error: {
          message: getErrorMessageExceptionList({ id, listId: undefined }),
          status_code: 404,
        },
        id,
        list_id: undefined,
      });
    } else {
      foundLists.push(transformSavedObjectToExceptionList({ savedObject }));
    }
  });

  if (foundLists.length === 0) {
    return { deleted: [], errors: notFoundErrors };
  }

  const { deleted, errors } = await deleteListsWithItems({
    foundLists,
    namespaceType,
    savedObjectType,
    savedObjectsClient,
  });

  return { deleted, errors: [...notFoundErrors, ...errors] };
};

/**
 * Full, self-contained pipeline for bulk-deleting lists identified by
 * list_id: resolve each list_id to its exception list (this already fetches
 * and validates it, so there is no separate bulkGet step), then delete each
 * resolved list (items, then container) as an independent, concurrency-limited
 * unit.
 */
const bulkDeleteExceptionListsByListIds = async ({
  listIds,
  namespaceType,
  savedObjectsClient,
}: Omit<BulkDeleteExceptionListOptions, 'ids'>): Promise<BulkDeleteExceptionListResult> => {
  const savedObjectType = getSavedObjectType({ namespaceType });

  const { lists: foundLists, listIds: unresolvedListIds } = await resolveExceptionListIds({
    listIds,
    namespaceType,
    savedObjectsClient,
  });

  const notFoundErrors: BulkDeleteExceptionListError[] = unresolvedListIds.map((listId) => ({
    error: {
      message: getErrorMessageExceptionList({ id: undefined, listId }),
      status_code: 404,
    },
    id: undefined,
    list_id: listId,
  }));

  if (foundLists.length === 0) {
    return { deleted: [], errors: notFoundErrors };
  }

  const { deleted, errors } = await deleteListsWithItems({
    foundLists,
    namespaceType,
    savedObjectType,
    savedObjectsClient,
  });

  return { deleted, errors: [...notFoundErrors, ...errors] };
};

/**
 * Bulk deletes exception lists (and their items). Callers provide either ids
 * or list_ids, never both (enforced at the route level), so this simply
 * dispatches to whichever path's full, independent implementation applies.
 */
export const bulkDeleteExceptionList = async ({
  ids,
  listIds,
  namespaceType,
  savedObjectsClient,
}: BulkDeleteExceptionListOptions): Promise<BulkDeleteExceptionListResult> => {
  if (listIds.length === 0 && ids.length === 0) {
    return {
      deleted: [],
      errors: [
        {
          error: {
            message: 'No ids or lists id provided',
            status_code: 400,
          },
          id: undefined,
          list_id: undefined,
        },
      ],
    };
  }

  if (listIds.length > 0) {
    return bulkDeleteExceptionListsByListIds({
      listIds: [...new Set(listIds)],
      namespaceType,
      savedObjectsClient,
    });
  } else {
    return bulkDeleteExceptionListsByIds({
      ids: [...new Set(ids)],
      namespaceType,
      savedObjectsClient,
    });
  }
};
