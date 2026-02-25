/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';

interface ExecuteEsqlQueryParams {
  esClient: ElasticsearchClient;
  query: string;
  abortController?: AbortController;
}

export const executeEsqlQuery = async ({
  esClient,
  query,
  abortController,
}: ExecuteEsqlQueryParams): Promise<ESQLSearchResponse> => {
  const options: TransportRequestOptions = {};
  if (abortController?.signal) {
    options.signal = abortController.signal;
  }

  const response = (await esClient.esql.query(
    {
      query,
      drop_null_columns: true,
      allow_partial_results: true,
    },
    options
  )) as unknown as ESQLSearchResponse;

  return response;
};
