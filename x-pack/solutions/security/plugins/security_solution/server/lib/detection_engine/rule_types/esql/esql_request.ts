/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError } from '@kbn/kibana-utils-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { logEsqlRequest } from '../utils/logged_requests';
import * as i18n from '../translations';

const setLatestRequestDuration = (
  startTime: number,
  loggedRequests: RulePreviewLoggedRequest[] | undefined
) => {
  const duration = performance.now() - startTime;
  if (loggedRequests && loggedRequests?.[loggedRequests.length - 1]) {
    loggedRequests[loggedRequests.length - 1].duration = Math.round(duration);
  }
};

export interface EsqlResultColumn {
  name: string;
  type: 'date' | 'keyword';
}

export type EsqlEsqlShardFailure = Record<string, unknown>;

type AsyncEsqlResponse = {
  id: string;
  is_running: boolean;
} & EsqlTable;

export type EsqlResultRow = Array<string | null>;

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
  _clusters?: {
    details?: {
      [key: string]: {
        failures?: EsqlEsqlShardFailure[];
      };
    };
  };
}

export const performEsqlRequest = async ({
  esClient,
  requestBody,
  requestQueryParams,
  ruleExecutionLogger,
  shouldStopExecution,
  loggedRequests,
}: {
  ruleExecutionLogger?: IRuleExecutionLogForExecutors;
  esClient: ElasticsearchClient;
  requestBody: {
    query: string;
    filter: QueryDslQueryContainer;
  };
  requestQueryParams?: {
    drop_null_columns?: boolean;
  };
  shouldStopExecution: () => boolean;
  loggedRequests?: RulePreviewLoggedRequest[];
}): Promise<EsqlTable> => {
  let pollInterval = 10 * 1000; // Poll every 10 seconds
  let pollCount = 0;
  let queryId: string = '';

  try {
    loggedRequests?.push({
      request: logEsqlRequest(requestBody, requestQueryParams),
      description: i18n.ESQL_SEARCH_REQUEST_DESCRIPTION,
      request_type: 'findMatches',
    });
    const asyncSearchStarted = performance.now();
    const asyncEsqlResponse = await esClient.transport.request<AsyncEsqlResponse>({
      method: 'POST',
      path: '/_query/async',
      body: requestBody,
      querystring: requestQueryParams,
    });
    setLatestRequestDuration(asyncSearchStarted, loggedRequests);

    queryId = asyncEsqlResponse.id;
    const isRunning = asyncEsqlResponse.is_running;

    if (!isRunning) {
      return asyncEsqlResponse;
    }

    // Poll for long-executing query
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      loggedRequests?.push({
        request: `GET /_query/async/${queryId}`,
        description: i18n.ESQL_POLL_REQUEST_DESCRIPTION,
      });
      const pollStarted = performance.now();
      const pollResponse = await esClient.transport.request<AsyncEsqlResponse>({
        method: 'GET',
        path: `/_query/async/${queryId}`,
      });
      setLatestRequestDuration(pollStarted, loggedRequests);

      if (!pollResponse.is_running) {
        return pollResponse;
      }

      pollCount++;

      if (pollCount > 60) {
        pollInterval = 60 * 1000; // Increase the poll interval after 10m
      }

      const isCancelled = shouldStopExecution(); // Execution will be cancelled if rule times out
      ruleExecutionLogger?.debug(`Polling for query ID: ${queryId}, isCancelled: ${isCancelled}`);

      if (isCancelled) {
        throw new Error('Rule execution cancelled due to timeout');
      }
      ruleExecutionLogger?.debug(`Query is still running for query ID: ${queryId}`);
    }
  } catch (error) {
    ruleExecutionLogger?.error(`Error while performing ES|QL search: ${error?.message}`);
    throw getKbnServerError(error);
  } finally {
    if (queryId) {
      loggedRequests?.push({
        request: `DELETE /_query/async/${queryId}`,
        description: i18n.ESQL_DELETE_REQUEST_DESCRIPTION,
      });
      const deleteStarted = performance.now();
      await esClient.transport.request({
        method: 'DELETE',
        path: `/_query/async/${queryId}`,
      });
      setLatestRequestDuration(deleteStarted, loggedRequests);
    }
  }
};
