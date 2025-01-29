/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  FoundExceptionListItemSchema,
  Id,
  PageOrUndefined,
  PerPageOrUndefined,
  PitOrUndefined,
  SearchAfterOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
} from '@kbn/securitysolution-list-utils';

import { escapeQuotes } from '../utils/escape_query';
import type { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectsToFoundExceptionListItem } from './utils';

interface FindValueListExceptionListsItems {
  valueListId: Id;
  savedObjectsClient: SavedObjectsClientContract;
  perPage: PerPageOrUndefined;
  pit: PitOrUndefined;
  page: PageOrUndefined;
  searchAfter: SearchAfterOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export const findValueListExceptionListItems = async ({
  valueListId,
  savedObjectsClient,
  page,
  pit,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
}: FindValueListExceptionListsItems): Promise<FoundExceptionListItemSchema | null> => {
  const escapedValueListId = escapeQuotes(valueListId);
  const savedObjectsFindResponse = await savedObjectsClient.find<ExceptionListSoSchema>({
    filter: `(exception-list.attributes.list_type: item AND exception-list.attributes.entries.list.id:"${escapedValueListId}") OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.entries.list.id:"${escapedValueListId}") `,
    page,
    perPage,
    pit,
    searchAfter,
    sortField,
    sortOrder,
    type: [exceptionListSavedObjectType, exceptionListAgnosticSavedObjectType],
  });
  return transformSavedObjectsToFoundExceptionListItem({
    savedObjectsFindResponse,
  });
};
