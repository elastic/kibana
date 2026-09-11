/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import type { EsKnowledgeBaseEntrySchema } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';

export interface GetKnowledgeBaseEntryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  knowledgeBaseIndex: string;
  id: string;
  user: AuthenticatedUser;
}

export const getKnowledgeBaseEntry = async ({
  esClient,
  logger,
  knowledgeBaseIndex,
  id,
  user,
}: GetKnowledgeBaseEntryParams): Promise<KnowledgeBaseEntryResponse | null> => {
  const userFilter = {
    should: [
      ...(user.profile_uid
        ? [
            {
              nested: {
                path: 'users',
                query: {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        match: { 'users.id': user.profile_uid },
                      },
                    ],
                  },
                },
              },
            },
          ]
        : []),
      {
        bool: {
          must_not: [
            {
              nested: {
                path: 'users',
                query: {
                  bool: {
                    filter: {
                      exists: {
                        field: 'users',
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    ],
  };
  try {
    const response = await esClient.search<EsKnowledgeBaseEntrySchema>({
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    term: {
                      _id: id,
                    },
                  },
                ],
              },
            },
          ],
          ...userFilter,
          minimum_should_match: 1,
        },
      },
      _source: true,
      ignore_unavailable: true,
      index: knowledgeBaseIndex,
      seq_no_primary_term: true,
    });
    const knowledgeBaseEntry = transformESSearchToKnowledgeBaseEntry(response);
    return knowledgeBaseEntry[0] ?? null;
  } catch (err) {
    logger.error(`Error fetching knowledge base entry: ${err} with id: ${id}`);
    throw err;
  }
};
