/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface DeleteAllConversationsParams {
  esClient: ElasticsearchClient;
  conversationIndex: string;
  logger: Logger;
  excludedIds?: string[];
}
export const deleteAllConversations = async ({
  esClient,
  conversationIndex,
  logger,
  excludedIds = [],
}: DeleteAllConversationsParams): Promise<DeleteByQueryResponse | undefined> => {
  try {
    const response = await esClient.deleteByQuery({
      query: {
        bool: {
          must: {
            match_all: {},
          },
          must_not: {
            ids: {
              values: excludedIds,
            },
          },
        },
      },
      conflicts: 'proceed',
      index: conversationIndex,
      refresh: true,
    });

    if (!response.deleted && response.deleted === 0) {
      logger.error('No conversations have been deleted.');
      throw Error('No conversations have been deleted.');
    }
    return response;
  } catch (err) {
    logger.error(`Error deleting all conversations: ${err}`);
    throw err;
  }
};
