/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { Id, ListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { waitUntilDocumentIndexed } from '../utils';

import { getList } from './get_list';

export interface DeleteListOptions {
  id: Id;
  esClient: ElasticsearchClient;
  listIndex: string;
  listItemIndex: string;
}

export const deleteList = async ({
  id,
  esClient,
  listIndex,
  listItemIndex,
}: DeleteListOptions): Promise<ListSchema | null> => {
  const list = await getList({ esClient, id, listIndex });
  if (list == null) {
    return null;
  } else {
    await esClient.deleteByQuery({
      body: {
        query: {
          term: {
            list_id: id,
          },
        },
      },
      conflicts: 'proceed',
      index: listItemIndex,
      refresh: false,
    });

    const response = await esClient.deleteByQuery({
      body: {
        query: {
          ids: {
            values: [id],
          },
        },
      },
      conflicts: 'proceed',
      index: listIndex,
      refresh: false,
    });

    if (response.deleted) {
      const checkIfListDeleted = async (): Promise<void> => {
        const deletedList = await getList({ esClient, id, listIndex });
        if (deletedList !== null) {
          throw Error('List has not been re-indexed in time');
        }
      };

      await waitUntilDocumentIndexed(checkIfListDeleted);
    } else {
      throw Error('No list has been deleted');
    }

    return list;
  }
};
