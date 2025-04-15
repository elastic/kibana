/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { omit, pick } from 'lodash';

// Search body fields as per https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html#search-search-api-request-body
const BODY_FIELDS = [
  'aggs',
  'aggregations',
  'docvalue_fields',
  'fields',
  'stored_fields',
  'explain',
  'from',
  'indices_boost',
  'knn',
  'min_score',
  'pit',
  'query',
  'retriever',
  'runtime_mappings',
  'seq_no_primary_term',
  'size',
  'sort',
  '_source',
  'stats',
  'terminate_after',
  'timeout',
  'version',
];

export const logSearchRequest = (searchRequest: estypes.SearchRequest): string => {
  const { index } = searchRequest;

  const params = {
    ...omit(searchRequest, [...BODY_FIELDS, 'index']),
  };

  const body = {
    ...pick(searchRequest, BODY_FIELDS),
  };

  const urlParams = Object.entries(params)
    .reduce<string[]>((acc, [key, value]) => {
      if (value != null) {
        acc.push(`${key}=${value}`);
      }

      return acc;
    }, [])
    .join('&');

  const url = `/${index}/_search${urlParams ? `?${urlParams}` : ''}`;

  if (body) {
    return `POST ${url}\n${JSON.stringify({ ...body }, null, 2)}`;
  }

  return `GET ${url}`;
};
