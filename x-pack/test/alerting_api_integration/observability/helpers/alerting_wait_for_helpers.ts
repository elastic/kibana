/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';

import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RetryService } from '@kbn/ftr-common-functional-services';
import { retry } from '../../common/retry';

const TIMEOUT = 70_000;
const RETRIES = 120;
const RETRY_DELAY = 500;

export async function waitForRuleStatus({
  id,
  expectedStatus,
  supertest,
  retryService,
  logger,
}: {
  id: string;
  expectedStatus: string;
  supertest: SuperTest.Agent;
  retryService: RetryService;
  logger: ToolingLog;
}): Promise<Record<string, any>> {
  const ruleResponse = await retry<Record<string, any>>({
    testFn: async () => {
      const response = await supertest.get(`/api/alerting/rule/${id}`);
      const { execution_status: executionStatus } = response.body || {};
      const { status } = executionStatus || {};
      if (status !== expectedStatus) {
        throw new Error(`waitForStatus(${expectedStatus}): got ${status}`);
      }
      return executionStatus;
    },
    utilityName: 'fetching rule',
    logger,
    retryService,
    timeout: TIMEOUT,
    retries: RETRIES,
    retryDelay: RETRY_DELAY,
  });

  return ruleResponse;
}

export async function waitForDocumentInIndex<T>({
  esClient,
  indexName,
  docCountTarget = 1,
  retryService,
  logger,
  timeout = TIMEOUT,
  retries = RETRIES,
  retryDelay = RETRY_DELAY,
}: {
  esClient: Client;
  indexName: string;
  docCountTarget?: number;
  retryService: RetryService;
  logger: ToolingLog;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return await retry<SearchResponse<T, Record<string, AggregationsAggregate>>>({
    testFn: async () => {
      const response = await esClient.search<T>({
        index: indexName,
        rest_total_hits_as_int: true,
        ignore_unavailable: true,
      });
      if (!response.hits.total || (response.hits.total as number) < docCountTarget) {
        logger.debug(`Document count is ${response.hits.total}, should be ${docCountTarget}`);
        throw new Error(
          `Number of hits does not match expectation (total: ${response.hits.total}, target: ${docCountTarget})`
        );
      }
      logger.debug(`Returned document: ${JSON.stringify(response.hits.hits[0])}`);
      return response;
    },
    utilityName: `waiting for documents in ${indexName} index`,
    logger,
    retryService,
    timeout,
    retries,
    retryDelay,
  });
}

export async function waitForAlertInIndex<T>({
  esClient,
  indexName,
  ruleId,
  retryService,
  logger,
}: {
  esClient: Client;
  indexName: string;
  ruleId: string;
  retryService: RetryService;
  logger: ToolingLog;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return await retry<SearchResponse<T, Record<string, AggregationsAggregate>>>({
    testFn: async () => {
      const response = await esClient.search<T>({
        index: indexName,
        body: {
          query: {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        },
      });
      if (response.hits.hits.length === 0) {
        throw new Error('No hits found');
      }
      return response;
    },
    utilityName: `waiting for alerting document in the alerting index (${indexName})`,
    logger,
    retryService,
    timeout: TIMEOUT,
    retries: RETRIES,
    retryDelay: RETRY_DELAY,
  });
}
