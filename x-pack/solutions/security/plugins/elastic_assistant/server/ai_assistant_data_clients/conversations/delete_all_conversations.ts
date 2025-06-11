/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface DeleteAllConversationsParams {
  esClient: ElasticsearchClient;
  conversationIndex: string;
  logger: Logger;
}
export const deleteAllConversations = async ({
  esClient,
  conversationIndex,
  logger,
}: DeleteAllConversationsParams): Promise<number | undefined> => {
  try {
    const response = await esClient.deleteByQuery({
      query: {
        match_all: {},
      },
      conflicts: 'proceed',
      index: conversationIndex,
      refresh: true,
    });

    if (!response.deleted && response.deleted === 0) {
      logger.error('No conversation has been deleted');
      throw Error('No conversation has been deleted');
    }
    return response.deleted;
  } catch (err) {
    logger.error(`Error deleting all conversations: ${err}`);
    throw err;
  }
};
