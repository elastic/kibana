/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsConversationSchema } from './types';

/**
 * Checks if a conversation exists by ID without user access filtering
 */
export const conversationExists = async ({
  esClient,
  logger,
  conversationIndex,
  id,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  conversationIndex: string;
  id: string;
}): Promise<boolean> => {
  try {
    const response = await esClient.search<EsConversationSchema>({
      query: {
        bool: {
          must: [
            {
              term: {
                _id: id,
              },
            },
          ],
        },
      },
      _source: false,
      ignore_unavailable: true,
      index: conversationIndex,
      size: 0,
    });
    return (response.hits.total as { value: number }).value > 0;
  } catch (err) {
    logger.error(`Error checking if conversation exists: ${err} with id: ${id}`);
    return false;
  }
};
