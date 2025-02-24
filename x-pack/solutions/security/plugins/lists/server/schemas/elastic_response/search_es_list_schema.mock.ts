/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  DATE_NOW,
  DESCRIPTION,
  IMMUTABLE,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
  VERSION,
} from '../../../common/constants.mock';
import { getShardMock } from '../common/get_shard.mock';

import { SearchEsListSchema } from './search_es_list_schema';

export const getSearchEsListMock = (): SearchEsListSchema => ({
  '@timestamp': DATE_NOW,
  created_at: DATE_NOW,
  created_by: USER,
  description: DESCRIPTION,
  deserializer: undefined,
  immutable: IMMUTABLE,
  meta: META,
  name: NAME,
  serializer: undefined,
  tie_breaker_id: TIE_BREAKER,
  type: TYPE,
  updated_at: DATE_NOW,
  updated_by: USER,
  version: VERSION,
});

export const getSearchListMock = (
  source?: SearchEsListSchema
): estypes.SearchResponse<SearchEsListSchema> => ({
  _scroll_id: '123',
  _shards: getShardMock(),
  hits: {
    hits: [
      {
        _id: LIST_ID,
        _index: LIST_INDEX,
        _score: 0,
        _source: source || getSearchEsListMock(),
      },
    ],
    max_score: 0,
    total: 1,
  },
  timed_out: false,
  took: 10,
});

export const getEmptySearchListMock = (): estypes.SearchResponse<SearchEsListSchema> => ({
  _scroll_id: '123',
  _shards: getShardMock(),
  hits: {
    hits: [],
    max_score: 0,
    total: 0,
  },
  timed_out: false,
  took: 10,
});
