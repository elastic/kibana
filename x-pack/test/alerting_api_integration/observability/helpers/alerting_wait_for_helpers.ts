/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';

import type SuperTest from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export async function waitForRuleStatus({
  id,
  expectedStatus,
  supertest,
}: {
  id: string;
  expectedStatus: string;
  supertest: SuperTest.SuperTest<SuperTest.Test>;
}): Promise<Record<string, any>> {
  return pRetry(
    async () => {
      const response = await supertest.get(`/api/alerting/rule/${id}`);
      const { execution_status: executionStatus } = response.body || {};
      const { status } = executionStatus || {};
      if (status !== expectedStatus) {
        throw new Error(`waitForStatus(${expectedStatus}): got ${status}`);
      }
      return executionStatus;
    },
    { retries: 10 }
  );
}

export async function waitForDocumentInIndex<T>({
  esClient,
  indexName,
}: {
  esClient: Client;
  indexName: string;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return pRetry(
    async () => {
      const response = await esClient.search<T>({ index: indexName });
      if (response.hits.hits.length === 0) {
        throw new Error('No hits found');
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function waitForAlertInIndex<T>({
  esClient,
  indexName,
  ruleId,
}: {
  esClient: Client;
  indexName: string;
  ruleId: string;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return pRetry(
    async () => {
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
    { retries: 10 }
  );
}
