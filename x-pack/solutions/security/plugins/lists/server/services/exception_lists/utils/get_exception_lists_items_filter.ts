/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NonEmptyStringArrayDecoded } from '@kbn/securitysolution-io-ts-types';
import type { SavedObjectType } from '@kbn/securitysolution-list-utils';

import { escapeQuotes } from '../../utils/escape_query';

/**
 *
 * This function differs from `getExceptionListsItemFilter` in that it accepts a single filter instead of one filter per listId.
 *
 * @param filter - The KQL filter to apply to the items.
 * @param listIds - An array of list IDs to filter the items by.
 * @param savedObjectType - An array of saved object types corresponding to the list IDs.
 * @returns A KQL filter string that can be used to query exception list items.
 */
export const getExceptionListsItemsFilter = ({
  filter,
  listIds,
  savedObjectTypes,
}: {
  listIds: NonEmptyStringArrayDecoded;
  filter: string | undefined;
  savedObjectTypes: SavedObjectType[];
}): string => {
  return listIds.reduce((filters, listId, index) => {
    const escapedListId = escapeQuotes(listId);
    const filterForList = `(${savedObjectTypes[index]}.attributes.list_type: item AND ${savedObjectTypes[index]}.attributes.list_id: "${escapedListId}")`;
    const filterToAppend = filter ? `(${filterForList} AND (${filter}))` : filterForList;

    if (!filters) {
      return filterToAppend;
    }
    return `${filters} OR ${filterToAppend}`;
  }, '');
};
