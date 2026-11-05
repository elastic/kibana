/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';

export interface DeleteAllConversationsParams {
  esClient: ElasticsearchClient;
  conversationIndex: string;
  logger: Logger;
  authenticatedUser: AuthenticatedUser;
  excludedIds?: string[];
}

/**
 * Matches conversations owned by the user. `created_by` is the owner when present.
 * Legacy documents have no `created_by` and store the owner as the only `users` entry.
 */
const getConversationOwnerFilter = (authenticatedUser: AuthenticatedUser) => ({
  bool: {
    should: [
      {
        bool: {
          must: [
            { exists: { field: 'created_by' } },
            {
              bool: {
                should: [
                  ...(authenticatedUser.profile_uid
                    ? [{ term: { 'created_by.id': authenticatedUser.profile_uid } }]
                    : []),
                  { term: { 'created_by.name': authenticatedUser.username } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      {
        bool: {
          must: [
            { bool: { must_not: [{ exists: { field: 'created_by' } }] } },
            {
              nested: {
                path: 'users',
                query: {
                  bool: {
                    should: [
                      ...(authenticatedUser.profile_uid
                        ? [{ term: { 'users.id': authenticatedUser.profile_uid } }]
                        : []),
                      { term: { 'users.name': authenticatedUser.username } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              },
            },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});

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
