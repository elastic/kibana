/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import type {
  ExceptionListSchema,
  Id,
  IdOrUndefined,
  ListId,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import type { ExceptionListSoSchema } from '../../schemas/saved_objects';
import { getErrorMessageExceptionList } from '../../routes/utils/get_error_message_exception_list';

import { getExceptionListItemIds } from './delete_exception_list_items_by_list';
import { bulkDeleteExceptionListItems } from './bulk_delete_exception_list_items';
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

/**
 * Full, self-contained pipeline for bulk-deleting lists identified by saved
 * object id: validate existence via a single bulkGet call, cascade-delete
 * their items via a single bulk call, then delete the list containers via a
 * single bulkDelete call.
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

  // Fetching all of the associated exception list items, to queue for deletion as well
  const itemIdsByList = await Promise.all(
    foundLists.map((list) =>
      getExceptionListItemIds({ listId: list.list_id, namespaceType, savedObjectsClient })
    )
  );
  // KNOWN LIMITATION: allItemIds is unbounded. A list can hold up to
  // MAX_EXCEPTION_LIST_SIZE (10,000) items, and up to MAX_BULK_DELETE_EXCEPTION_LISTS
  // (100) lists can be deleted per request, so this array (and the single
  // bulkDeleteExceptionListItems call built from it) can reach up to ~1,000,000
  // entries in the worst case. That risks a large transient memory footprint and
  // a single savedObjectsClient.bulkDelete() request big enough to hit ES/Kibana
  // payload limits before it hits a memory ceiling. Needs either chunking this
  // array into safe-sized batches before deletion, or a total-item cap across the
  // batch (mirroring the combined-object cap used by the bulk export endpoint).
  // Tracked in the issue tracker; not yet fixed.
  const allItemIds = itemIdsByList.flat();

  // Item cascade and list-container deletion touch different saved object
  // types and neither is gated on the other's outcome (no rollback either
  // way, matching existing single-delete semantics), so they run concurrently
  // instead of one after the other.
  const [, { statuses }] = await Promise.all([
    allItemIds.length > 0
      ? bulkDeleteExceptionListItems({ ids: allItemIds, namespaceType, savedObjectsClient })
      : Promise.resolve(),
    savedObjectsClient.bulkDelete(
      foundLists.map((list) => ({ id: list.id, type: savedObjectType }))
    ),
  ]);

  const deleted: ExceptionListSchema[] = [];
  const deleteErrors: BulkDeleteExceptionListError[] = [];

  statuses.forEach((status, index) => {
    const list = foundLists[index];
    if (status.success) {
      deleted.push(list);
    } else {
      deleteErrors.push({
        error: {
          message: status.error?.message ?? 'Unknown error',
          status_code: status.error?.statusCode ?? 500,
        },
        id: list.id,
        list_id: list.list_id,
      });
    }
  });

  return { deleted, errors: [...notFoundErrors, ...deleteErrors] };
};

/**
 * Full, self-contained pipeline for bulk-deleting lists identified by
 * list_id: resolve each list_id to its exception list (this already fetches
 * and validates it, so there is no separate bulkGet step), cascade-delete
 * their items via a single bulk call, then delete the list containers via a
 * single bulkDelete call.
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

  const itemIdsByList = await Promise.all(
    foundLists.map((list) =>
      getExceptionListItemIds({ listId: list.list_id, namespaceType, savedObjectsClient })
    )
  );
  // KNOWN LIMITATION: allItemIds is unbounded. A list can hold up to
  // MAX_EXCEPTION_LIST_SIZE (10,000) items, and up to MAX_BULK_DELETE_EXCEPTION_LISTS
  // (100) lists can be deleted per request, so this array (and the single
  // bulkDeleteExceptionListItems call built from it) can reach up to ~1,000,000
  // entries in the worst case. That risks a large transient memory footprint and
  // a single savedObjectsClient.bulkDelete() request big enough to hit ES/Kibana
  // payload limits before it hits a memory ceiling. Needs either chunking this
  // array into safe-sized batches before deletion, or a total-item cap across the
  // batch (mirroring the combined-object cap used by the bulk export endpoint).
  // Tracked in the issue tracker; not yet fixed.
  const allItemIds = itemIdsByList.flat();

  // Item cascade and list-container deletion touch different saved object
  // types and neither is gated on the other's outcome (no rollback either
  // way, matching existing single-delete semantics), so they run concurrently
  // instead of one after the other.
  const [, { statuses }] = await Promise.all([
    allItemIds.length > 0
      ? bulkDeleteExceptionListItems({ ids: allItemIds, namespaceType, savedObjectsClient })
      : Promise.resolve(),
    savedObjectsClient.bulkDelete(
      foundLists.map((list) => ({ id: list.id, type: savedObjectType }))
    ),
  ]);

  const deleted: ExceptionListSchema[] = [];
  const deleteErrors: BulkDeleteExceptionListError[] = [];

  statuses.forEach((status, index) => {
    const list = foundLists[index];
    if (status.success) {
      deleted.push(list);
    } else {
      deleteErrors.push({
        error: {
          message: status.error?.message ?? 'Unknown error',
          status_code: status.error?.statusCode ?? 500,
        },
        id: list.id,
        list_id: list.list_id,
      });
    }
  });

  return { deleted, errors: [...notFoundErrors, ...deleteErrors] };
};

/**
 * Bulk deletes exception list containers. Callers provide either ids or
 * list_ids, never both (enforced at the route level), so this simply
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
    return bulkDeleteExceptionListsByListIds({ listIds, namespaceType, savedObjectsClient });
  } else {
    return bulkDeleteExceptionListsByIds({ ids, namespaceType, savedObjectsClient });
  }
};
