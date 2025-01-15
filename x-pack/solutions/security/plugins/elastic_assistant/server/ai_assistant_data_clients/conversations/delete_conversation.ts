/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface DeleteConversationParams {
  esClient: ElasticsearchClient;
  conversationIndex: string;
  id: string;
  logger: Logger;
}
export const deleteConversation = async ({
  esClient,
  conversationIndex,
  id,
  logger,
}: DeleteConversationParams): Promise<number | undefined> => {
  try {
    const response = await esClient.deleteByQuery({
      body: {
        query: {
          ids: {
            values: [id],
          },
        },
      },
      conflicts: 'proceed',
      index: conversationIndex,
      refresh: true,
    });

    if (!response.deleted && response.deleted === 0) {
      logger.error(`Error deleting conversation by id: ${id}`);
      throw Error('No conversation has been deleted');
    }
    return response.deleted;
  } catch (err) {
    logger.error(`Error deleting conversation: ${err} with id: ${id}`);
    throw err;
  }
};
