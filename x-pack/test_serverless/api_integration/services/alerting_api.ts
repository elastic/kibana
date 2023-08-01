/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { FtrProviderContext } from '../ftr_provider_context';

export function AlertingApiProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');
  const es = getService('es');
  const requestTimeout = 30 * 1000;
  const retryTimeout = 120 * 1000;

  return {
    async waitForRuleStatus({
      ruleId,
      expectedStatus,
    }: {
      ruleId: string;
      expectedStatus: string;
    }) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertest
          .get(`/api/alerting/rule/${ruleId}`)
          .set('kbn-xsrf', 'foo')
          .set('x-elastic-internal-origin', 'foo')
          .timeout(requestTimeout);
        const { execution_status: executionStatus } = response.body || {};
        const { status } = executionStatus || {};
        if (status !== expectedStatus) {
          throw new Error(`waitForStatus(${expectedStatus}): got ${status}`);
        }
        return executionStatus?.status;
      });
    },

    async waitForDocumentInIndex<T>({
      indexName,
    }: {
      indexName: string;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({ index: indexName });
        if (response.hits.hits.length === 0) {
          throw new Error('No hits found');
        }
        return response;
      });
    },

    async waitForAlertInIndex<T>({
      indexName,
      ruleId,
    }: {
      indexName: string;
      ruleId: string;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
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
      });
    },
  };
}
