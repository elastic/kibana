/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type {
  BulkErrorSchema,
  ImportExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  ImportExceptionsListSchema,
  ImportExceptionsResponseSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { createPromiseFromStreams } from '@kbn/utils';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { chunk } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { importExceptionLists } from './utils/import/import_exception_lists';
import { importExceptionListItems } from './utils/import/import_exception_list_items';
import { deleteListItemsToBeOverwritten } from './utils/import/delete_list_items_to_overwrite';
import { getTupleErrorsAndUniqueExceptionLists } from './utils/import/dedupe_incoming_lists';
import { getTupleErrorsAndUniqueExceptionListItems } from './utils/import/dedupe_incoming_items';
import { createExceptionsStreamFromNdjson } from './utils/import/create_exceptions_stream_logic';
import { getAllListTypes } from './utils/import/find_all_exception_list_types';
import { sortExceptionListsToUpdateOrCreate } from './utils/import/sort_exception_lists_to_create_update';

export interface PromiseFromStreams {
  lists: Array<ImportExceptionListSchemaDecoded | Error>;
  items: Array<ImportExceptionListItemSchemaDecoded | Error>;
}
export interface ImportExceptionsOk {
  id?: string;
  item_id?: string;
  list_id?: string;
  status_code: number;
  message?: string;
}

export type ImportResponse = ImportExceptionsOk | BulkErrorSchema;

export type PromiseStream = ImportExceptionsListSchema | ImportExceptionListItemSchema | Error;

export interface ImportDataResponse {
  success: boolean;
  success_count: number;
  errors: BulkErrorSchema[];
}
interface ImportExceptionListAndItemsOptions {
  exceptions: PromiseFromStreams;
  overwrite: boolean;
  generateNewListId: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}

interface ImportExceptionListAndItemsAsStreamOptions {
  exceptionsToImport: Readable;
  maxExceptionsImportSize: number;
  overwrite: boolean;
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}
export type ExceptionsImport = Array<ImportExceptionListItemSchema | ImportExceptionsListSchema>;

export const CHUNK_PARSED_OBJECT_SIZE = 1000;

/**
 * Import exception lists parent containers and items as stream. The shape of the list and items
 * will be validated here as well.
 * @params exceptionsToImport {stream} ndjson stream of lists and items to be imported
 * @params maxExceptionsImportSize {number} the max number of lists and items to import, defaults to 10,000
 * @params overwrite {boolean} whether or not to overwrite an exception list with imported list if a matching list_id found
 * @params savedObjectsClient {object} SO client
 * @params user {string} user importing list and items
 * @return {ImportExceptionsResponseSchema} summary of imported count and errors
 */
export const importExceptionsAsStream = async ({
  exceptionsToImport,
  maxExceptionsImportSize,
  overwrite,
  savedObjectsClient,
  user,
}: ImportExceptionListAndItemsAsStreamOptions): Promise<ImportExceptionsResponseSchema> => {
  // validation of import and sorting of lists and items
  const readStream = createExceptionsStreamFromNdjson(maxExceptionsImportSize);
  const [parsedObjects] = await createPromiseFromStreams<PromiseFromStreams[]>([
    exceptionsToImport,
    ...readStream,
  ]);

  return importExceptions({
    exceptions: parsedObjects,
    generateNewListId: false,
    overwrite,
    savedObjectsClient,
    user,
  });
};

/**
 * Delete exception list items for lists being overwritten.
 * This is called AFTER items are imported to avoid race condition where
 * rules would see empty exception lists during import.
 */
const deleteOverwrittenListItems = async ({
  generateNewListId,
  isOverwrite,
  listsChunks,
  savedObjectsClient,
  user,
}: {
  generateNewListId: boolean;
  isOverwrite: boolean;
  listsChunks: ImportExceptionListSchemaDecoded[][];
  savedObjectsClient: SavedObjectsClientContract;
  user: string;
}): Promise<void> => {
  if (!isOverwrite) {
    return;
  }

  for await (const listChunk of listsChunks) {
    // sort by namespaceType
    const [agnosticLists, nonAgnosticLists] = sortListsImportsByNamespace(listChunk);

    // Gather lists referenced by items
    const foundLists = await getAllListTypes(
      agnosticLists.map((list) => ({ listId: list.list_id, namespaceType: list.namespace_type })),
      nonAgnosticLists.map((list) => ({
        listId: list.list_id,
        namespaceType: list.namespace_type,
      })),
      savedObjectsClient
    );

    // Figure out what lists need items deleted
    const { listItemsToDelete } = sortExceptionListsToUpdateOrCreate({
      existingLists: foundLists,
      generateNewListId,
      isOverwrite,
      lists: listChunk,
      user,
    });

    // Delete items AFTER new items have been imported
    await deleteListItemsToBeOverwritten({
      listsOfItemsToDelete: listItemsToDelete,
      savedObjectsClient,
    });
  }
};

import { sortListsImportsByNamespace } from './utils/import/sort_import_by_namespace';

export const importExceptions = async ({
  exceptions,
  overwrite,
  generateNewListId,
  savedObjectsClient,
  user,
}: ImportExceptionListAndItemsOptions): Promise<ImportExceptionsResponseSchema> => {
  let exceptionsToValidate = exceptions;
  if (generateNewListId) {
    // we need to generate a new list id and update the old list id references
    // in each list item to point to the new list id
    exceptionsToValidate = exceptions.lists.reduce(
      (acc, exceptionList) => {
        if (exceptionList instanceof Error) {
          return { items: [...acc.items], lists: [...acc.lists] };
        }
        const newListId = uuidv4();

        return {
          items: [
            ...acc.items,
            ...exceptions.items
              .filter(
                (item) =>
                  !(item instanceof Error) &&
                  !(exceptionList instanceof Error) &&
                  item?.list_id === exceptionList?.list_id
              )
              .map((item) => ({ ...item, list_id: newListId })),
          ],
          lists: [...acc.lists, { ...exceptionList, list_id: newListId }],
        };
      },
      { items: [], lists: [] } as PromiseFromStreams
    );
  }
  // removal of duplicates
  const [exceptionListDuplicateErrors, uniqueExceptionLists] =
    getTupleErrorsAndUniqueExceptionLists(exceptionsToValidate.lists);
  const [exceptionListItemsDuplicateErrors, uniqueExceptionListItems] =
    getTupleErrorsAndUniqueExceptionListItems(exceptionsToValidate.items);

  // chunking of validated import stream
  const chunkParsedListObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueExceptionLists);
  const chunkParsedItemsObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueExceptionListItems);

  // Import items FIRST to avoid race condition where rules see empty exception lists
  // between delete and recreate operations
  const importExceptionListItemsResponse = await importExceptionListItems({
    isOverwrite: overwrite,
    itemsChunks: chunkParsedItemsObjects,
    savedObjectsClient,
    user,
  });

  // Import exception list containers (skip internal item deletion - we handle it below)
  const importExceptionListsResponse = await importExceptionLists({
    deleteItemsOnOverwrite: false, // Skip deletion here, we do it after items import
    generateNewListId,
    isOverwrite: overwrite,
    listsChunks: chunkParsedListObjects,
    savedObjectsClient,
    user,
  });

  // Delete old items AFTER new items are imported to prevent false-positive alerts
  // This ensures rules always have exception items to evaluate against
  await deleteOverwrittenListItems({
    generateNewListId,
    isOverwrite: overwrite,
    listsChunks: chunkParsedListObjects,
    savedObjectsClient,
    user,
  });

  const importsSummary = {
    errors: [
      ...importExceptionListsResponse.errors,
      ...exceptionListDuplicateErrors,
      ...importExceptionListItemsResponse.errors,
      ...exceptionListItemsDuplicateErrors,
    ],
    success_count_exception_list_items: importExceptionListItemsResponse.success_count,
    success_count_exception_lists: importExceptionListsResponse.success_count,
    success_exception_list_items:
      importExceptionListItemsResponse.errors.length === 0 &&
      exceptionListItemsDuplicateErrors.length === 0,
    success_exception_lists:
      importExceptionListsResponse.errors.length === 0 && exceptionListDuplicateErrors.length === 0,
  };

  return {
    ...importsSummary,
    success: importsSummary.success_exception_list_items && importsSummary.success_exception_lists,
    success_count:
      importsSummary.success_count_exception_lists +
      importsSummary.success_count_exception_list_items,
  };
};
