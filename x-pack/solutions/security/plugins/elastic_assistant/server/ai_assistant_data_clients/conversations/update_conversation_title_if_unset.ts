/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EsConversationSchema } from './types';
import { getConversationOwnerFilter } from '../../lib/data_stream/get_conversation_owner_filter';

const MAX_ATTEMPTS = 3;

export interface UpdateConversationTitleIfUnsetParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  conversationIndex: string;
  id: string;
  title: string;
  placeholderTitle: string;
  user?: AuthenticatedUser;
}

const isVersionConflict = (err: unknown): boolean =>
  err instanceof errors.ResponseError && err.statusCode === 409;

/**
 * Sets the title only while the stored one is empty or `placeholderTitle`, so a concurrent rename is never overwritten.
 */
export const updateConversationTitleIfUnset = async ({
  esClient,
  logger,
  conversationIndex,
  id,
  title,
  placeholderTitle,
  user,
}: UpdateConversationTitleIfUnsetParams): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await esClient.search<Pick<EsConversationSchema, 'title'>>({
      query: {
        bool: {
          must: [{ term: { _id: id } }],
          ...(user ? { filter: [getConversationOwnerFilter(user)] } : {}),
        },
      },
      _source: ['title'],
      ignore_unavailable: true,
      index: conversationIndex,
      seq_no_primary_term: true,
      size: 1,
    });

    const [hit] = response.hits.hits;
    const currentTitle = hit?._source?.title;
    if (!hit || (currentTitle?.length && currentTitle !== placeholderTitle)) {
      return false;
    }

    try {
      // A concurrent write (e.g. a rename) bumps the seq_no and makes this update fail with 409.
      await esClient.update({
        index: hit._index,
        id,
        if_seq_no: hit._seq_no,
        if_primary_term: hit._primary_term,
        doc: { title, updated_at: new Date().toISOString() },
        refresh: 'wait_for',
      });
      return true;
    } catch (err) {
      if (!isVersionConflict(err)) {
        throw err;
      }
    }
  }

  logger.warn(`Skipped title update of conversation ${id}: it kept changing concurrently`);
  return false;
};
