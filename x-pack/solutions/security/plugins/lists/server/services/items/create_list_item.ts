/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  IdOrUndefined,
  ListItemSchema,
  MetaOrUndefined,
  RefreshWithWaitFor,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { transformListItemToElasticQuery } from '../utils';
import type { IndexEsListItemSchema } from '../../schemas/elastic_query';

export interface CreateListItemOptions {
  id: IdOrUndefined;
  listId: string;
  type: Type;
  value: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
  refresh?: RefreshWithWaitFor;
}

export const createListItem = async ({
  id,
  listId,
  type,
  value,
  esClient,
  listItemIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
  refresh = 'wait_for',
}: CreateListItemOptions): Promise<ListItemSchema | null> => {
  const createdAt = dateNow ?? new Date().toISOString();
  const tieBreakerId = tieBreaker ?? uuidv4();
  const baseBody = {
    '@timestamp': createdAt,
    created_at: createdAt,
    created_by: user,
    list_id: listId,
    meta,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    updated_by: user,
  };
  const elasticQuery = transformListItemToElasticQuery({ type, value });
  if (elasticQuery != null) {
    const body: IndexEsListItemSchema = {
      ...baseBody,
      ...elasticQuery,
    };
    const response = await esClient.create({
      body,
      id: id ?? uuidv4(),
      index: listItemIndex,
      refresh,
    });

    return {
      _version: encodeHitVersion(response),
      id: response._id,
      type,
      value,
      ...baseBody,
    };
  } else {
    return null;
  }
};
