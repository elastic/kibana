/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { omit, pick } from 'lodash';
import { convertToQueryString } from './utils';

const QUERY_FIELDS = [
  'allow_no_indices',
  'allow_partial_sequence_results',
  'expand_wildcards',
  'ignore_unavailable',
  'keep_alive',
  'keep_on_completion',
  'wait_for_completion_timeout',
];

export const logEqlRequest = (searchRequest: EqlSearchRequest): string => {
  const params = {
    ...pick(searchRequest, QUERY_FIELDS),
    ...searchRequest.querystring,
  };

  const body = {
    ...omit(searchRequest, [...QUERY_FIELDS, 'index', 'querystring', 'body']),
    ...(searchRequest.body as Record<string, unknown>),
  };

  return `POST /${searchRequest.index}/_eql/search${convertToQueryString(params)}\n${JSON.stringify(
    body,
    null,
    2
  )}`;
};
