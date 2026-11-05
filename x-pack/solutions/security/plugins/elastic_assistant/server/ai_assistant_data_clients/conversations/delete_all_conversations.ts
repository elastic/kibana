/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { getConversationOwnerFilter } from '../../lib/data_stream/get_conversation_owner_filter';

export interface DeleteAllConversationsParams {
  esClient: ElasticsearchClient;
  conversationIndex: string;
  logger: Logger;
  authenticatedUser: AuthenticatedUser;
  excludedIds?: string[];
}

export const deleteAllConversations = async ({
  esClient,
  conversationIndex,
  logger,
  authenticatedUser,
  excludedIds = [],
}: DeleteAllConversationsParams): Promise<DeleteByQueryResponse | undefined> => {
  try {
    const response = await esClient.deleteByQuery({
      query: {
        bool: {
          must: {
            match_all: {},
          },
          filter: getConversationOwnerFilter(authenticatedUser),
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

    return response;
  } catch (err) {
    logger.error(`Error deleting all conversations: ${err}`);
    throw err;
  }
};
