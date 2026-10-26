/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ESSearchResponse } from '@kbn/es-types';

export async function typedSearch<
  DocumentSource extends unknown,
  TParams extends estypes.SearchRequest
>(
  esClient: ElasticsearchClient,
  params: TParams
): Promise<ESSearchResponse<DocumentSource, TParams>> {
  return (await esClient.search(params)) as unknown as ESSearchResponse<DocumentSource, TParams>;
}

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}
