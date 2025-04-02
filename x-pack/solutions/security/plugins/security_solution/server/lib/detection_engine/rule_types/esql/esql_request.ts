/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';

export interface EsqlResultColumn {
  name: string;
  type: 'date' | 'keyword';
}

type AsyncEsqlResponse = {
  id: string;
  is_running: boolean;
} & EsqlTable;

export type EsqlResultRow = Array<string | null>;

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

export const performEsqlRequest = async ({
  esClient,
  requestBody,
  requestQueryParams,
  ruleExecutionLogger,
  shouldStopExecution,
}: {
  ruleExecutionLogger?: IRuleExecutionLogForExecutors;
  esClient: ElasticsearchClient;
  requestBody: Record<string, unknown>;
  requestQueryParams?: { drop_null_columns?: boolean };
  shouldStopExecution: () => boolean;
}): Promise<EsqlTable> => {
  let pollInterval = 10 * 1000; // Poll every 10 seconds
  let pollCount = 0;
  let queryId: string = '';

  try {
    const asyncEsqlResponse = await esClient.transport.request<AsyncEsqlResponse>({
      method: 'POST',
      path: '/_query/async',
      body: requestBody,
      querystring: requestQueryParams,
    });

    queryId = asyncEsqlResponse.id;
    const isRunning = asyncEsqlResponse.is_running;

    if (!isRunning) {
      return asyncEsqlResponse;
    }

    // Poll for long-executing query
    while (true) {
      try {
        const pollResponse = await esClient.transport.request<AsyncEsqlResponse>({
          method: 'GET',
          path: `/_query/async/${queryId}`,
        });

        if (!pollResponse.is_running) {
          return pollResponse;
        }

        ruleExecutionLogger?.debug(`Query is still running for query ID: ${queryId}`);
      } catch (error) {
        ruleExecutionLogger?.error(
          `Error while polling for query ID: ${queryId}, error: ${error.message}`
        );
        throw error;
      }

      pollCount++;

      if (pollCount > 60) {
        pollInterval = 60 * 1000; // Increase the poll interval after 10m
      }
      if (pollCount > 120) {
        pollInterval = 10 * 60 * 1000; // Increase the poll interval further after ~ 1h
      }

      const isCancelled = shouldStopExecution(); // Execution will be cancelled if rule timeouts
      ruleExecutionLogger?.debug(`Polling for query ID: ${queryId}, isCancelled: ${isCancelled}`);

      if (isCancelled) {
        throw new Error('Rule execution cancelled due to timeout');
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  } catch (e) {
    if (queryId) {
      await esClient.transport.request({
        method: 'DELETE',
        path: `/_query/async/${queryId}`,
      });
    }

    throw getKbnServerError(e);
  }
};
