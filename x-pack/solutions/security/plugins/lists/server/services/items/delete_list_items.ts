/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { Ids, ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

import { waitUntilDocumentIndexed } from '../utils';

import { getListItems } from '.';

export interface DeleteListItemOptions {
  ids: Ids;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  refresh?: boolean;
}

export const deleteListItems = async ({
  ids,
  esClient,
  listItemIndex,
  refresh = false,
}: DeleteListItemOptions): Promise<ListItemSchema[] | null> => {
  const listItems = await getListItems({ esClient, ids, listItemIndex });
  if (listItems == null) {
    return null;
  } else {
    const response = await esClient.deleteByQuery({
      index: listItemIndex,
      query: {
        ids: {
          values: ids,
        },
      },
      refresh,
    });

    if (response.deleted) {
      const checkIfListItemDeleted = async (): Promise<void> => {
        const deletedListItem = await getListItems({ esClient, ids, listItemIndex });
        if (deletedListItem !== null) {
          throw Error(
            'List item was deleted, but the change was not propagated in the expected time interval.'
          );
        }
      };

      await waitUntilDocumentIndexed(checkIfListItemDeleted);
    } else {
      throw Error('Deletion of List Item [item_id] from [item_index] was not successful');
    }
  }
  return listItems;
};
