/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';

export interface EsqlResultColumn {
  name: string;
  type: 'date' | 'keyword';
}

export type EsqlResultRow = Array<string | null>;

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

export const performEsqlRequest = async ({
  esClient,
  requestBody,
  requestQueryParams,
}: {
  logger?: Logger;
  esClient: ElasticsearchClient;
  requestBody: Record<string, unknown>;
  requestQueryParams?: { drop_null_columns?: boolean };
}): Promise<EsqlTable> => {
  const search = async () => {
    try {
      const rawResponse = await esClient.transport.request<EsqlTable>({
        method: 'POST',
        path: '/_query',
        body: requestBody,
        querystring: requestQueryParams,
      });
      return {
        rawResponse,
        isPartial: false,
        isRunning: false,
      };
    } catch (e) {
      throw getKbnServerError(e);
    }
  };

  return (await search()).rawResponse;
};
