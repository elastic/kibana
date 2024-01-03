/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { SuperTest, Test } from 'supertest';
import type { Client } from '@elastic/elasticsearch';
import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { runRule } from './alerting_api_helper';

export async function waitForDocumentInIndex({
  esClient,
  indexName,
  ruleId,
  num = 1,
  sort = 'desc',
}: {
  esClient: Client;
  indexName: string;
  ruleId: string;
  num?: number;
  sort?: 'asc' | 'desc';
}): Promise<SearchResponse> {
  return await pRetry(
    async () => {
      const response = await esClient.search({
        index: indexName,
        sort: `date:${sort}`,
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    'ruleId.keyword': ruleId,
                  },
                },
              ],
            },
          },
        },
      });
      if (response.hits.hits.length < num) {
        throw new Error(`Only found ${response.hits.hits.length} / ${num} documents`);
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function getDocumentsInIndex({
  esClient,
  indexName,
  ruleId,
}: {
  esClient: Client;
  indexName: string;
  ruleId: string;
}): Promise<SearchResponse> {
  return await esClient.search({
    index: indexName,
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                'ruleId.keyword': ruleId,
              },
            },
          ],
        },
      },
    },
  });
}

export async function createIndex({
  esClient,
  indexName,
}: {
  esClient: Client;
  indexName: string;
}) {
  return await esClient.indices.create(
    {
      index: indexName,
      body: {},
    },
    { meta: true }
  );
}

export async function waitForAlertInIndex<T>({
  esClient,
  filter,
  indexName,
  ruleId,
  num = 1,
}: {
  esClient: Client;
  filter: Date;
  indexName: string;
  ruleId: string;
  num: number;
}): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
  return await pRetry(
    async () => {
      const response = await esClient.search<T>({
        index: indexName,
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    'kibana.alert.rule.uuid': ruleId,
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: filter.getTime().toString(),
                    },
                  },
                },
              ],
            },
          },
        },
      });
      if (response.hits.hits.length < num) {
        throw new Error(`Only found ${response.hits.hits.length} / ${num} documents`);
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function waitForAllTasksIdle({
  esClient,
  filter,
}: {
  esClient: Client;
  filter: Date;
}): Promise<SearchResponse> {
  return await pRetry(
    async () => {
      const response = await esClient.search({
        index: '.kibana_task_manager',
        body: {
          query: {
            bool: {
              must: [
                {
                  terms: {
                    'task.scope': ['actions', 'alerting'],
                  },
                },
                {
                  range: {
                    'task.scheduledAt': {
                      gte: filter.getTime().toString(),
                    },
                  },
                },
              ],
              must_not: [
                {
                  term: {
                    'task.status': 'idle',
                  },
                },
              ],
            },
          },
        },
      });
      if (response.hits.hits.length !== 0) {
        throw new Error(`Expected 0 hits but received ${response.hits.hits.length}`);
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function waitForAllTasks({
  esClient,
  filter,
  taskType,
  attempts,
}: {
  esClient: Client;
  filter: Date;
  taskType: string;
  attempts: number;
}): Promise<SearchResponse> {
  return await pRetry(
    async () => {
      const response = await esClient.search({
        index: '.kibana_task_manager',
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    'task.status': 'idle',
                  },
                },
                {
                  term: {
                    'task.attempts': attempts,
                  },
                },
                {
                  terms: {
                    'task.scope': ['actions', 'alerting'],
                  },
                },
                {
                  term: {
                    'task.taskType': taskType,
                  },
                },
                {
                  range: {
                    'task.scheduledAt': {
                      gte: filter.getTime().toString(),
                    },
                  },
                },
              ],
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

export async function waitForDisabled({
  esClient,
  ruleId,
  filter,
}: {
  esClient: Client;
  ruleId: string;
  filter: Date;
}): Promise<SearchResponse> {
  return await pRetry(
    async () => {
      const response = await esClient.search({
        index: '.kibana_task_manager',
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    'task.id': `task:${ruleId}`,
                  },
                },
                {
                  terms: {
                    'task.scope': ['actions', 'alerting'],
                  },
                },
                {
                  range: {
                    'task.scheduledAt': {
                      gte: filter.getTime().toString(),
                    },
                  },
                },
                {
                  term: {
                    'task.enabled': true,
                  },
                },
              ],
            },
          },
        },
      });
      if (response.hits.hits.length !== 0) {
        throw new Error(`Expected 0 hits but received ${response.hits.hits.length}`);
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function waitForExecutionEventLog({
  esClient,
  filter,
  ruleId,
  num = 1,
}: {
  esClient: Client;
  filter: Date;
  ruleId: string;
  num?: number;
}): Promise<SearchResponse> {
  return await pRetry(
    async () => {
      const response = await esClient.search({
        index: '.kibana-event-log*',
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    'rule.id': {
                      value: ruleId,
                    },
                  },
                },
                {
                  term: {
                    'event.provider': {
                      value: 'alerting',
                    },
                  },
                },
                {
                  term: {
                    'event.action': 'execute',
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gte: filter.getTime().toString(),
                    },
                  },
                },
              ],
            },
          },
        },
      });
      if (response.hits.hits.length < num) {
        throw new Error('No hits found');
      }
      return response;
    },
    { retries: 10 }
  );
}

export async function waitForNumRuleRuns({
  supertest,
  numOfRuns,
  ruleId,
  esClient,
  testStart,
}: {
  supertest: SuperTest<Test>;
  numOfRuns: number;
  ruleId: string;
  esClient: Client;
  testStart: Date;
}) {
  for (let i = 0; i < numOfRuns; i++) {
    await pRetry(
      async () => {
        await runRule({ supertest, ruleId });
        await waitForExecutionEventLog({
          esClient,
          filter: testStart,
          ruleId,
          num: i + 1,
        });
        await waitForAllTasksIdle({ esClient, filter: testStart });
      },
      { retries: 10 }
    );
  }
}
