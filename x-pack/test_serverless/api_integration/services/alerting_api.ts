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

import { MetricThresholdParams } from '@kbn/infra-plugin/common/alerting/metrics';
import { ThresholdParams } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { RoleCredentials } from '../../shared/services';
import { SloBurnRateRuleParams } from './slo_api';
import { FtrProviderContext } from '../ftr_provider_context';

export function AlertingApiProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const requestTimeout = 30 * 1000;
  const retryTimeout = 120 * 1000;
  const logger = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return {
    async waitForRuleStatus({
      roleAuthc,
      ruleId,
      expectedStatus,
    }: {
      roleAuthc: RoleCredentials;
      ruleId: string;
      expectedStatus: string;
    }) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .get(`/api/alerting/rule/${ruleId}`)
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
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
      docCountTarget = 1,
    }: {
      indexName: string;
      docCountTarget?: number;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
          index: indexName,
          rest_total_hits_as_int: true,
        });
        logger.debug(`Found ${response.hits.total} docs, looking for atleast ${docCountTarget}.`);
        if (!response.hits.total || (response.hits.total as number) < docCountTarget) {
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

    async createIndexConnector({
      roleAuthc,
      name,
      indexName,
    }: {
      roleAuthc: RoleCredentials;
      name: string;
      indexName: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/actions/connector`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          name,
          config: {
            index: indexName,
            refresh: true,
          },
          connector_type_id: '.index',
        });
      return body.id as string;
    },

    async createRule({
      roleAuthc,
      name,
      ruleTypeId,
      params,
      actions = [],
      tags = [],
      schedule,
      consumer,
    }: {
      roleAuthc: RoleCredentials;
      ruleTypeId: string;
      name: string;
      params: MetricThresholdParams | ThresholdParams | SloBurnRateRuleParams;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      consumer: string;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader)
        .send({
          params,
          consumer,
          schedule: schedule || {
            interval: '5m',
          },
          tags,
          name,
          rule_type_id: ruleTypeId,
          actions,
        });
      return body;
    },

    async findRule(roleAuthc: RoleCredentials, ruleId: string) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      const response = await supertestWithoutAuth
        .get('/api/alerting/rules/_find')
        .set(svlCommonApi.getInternalRequestHeader())
        .set(roleAuthc.apiKeyHeader);
      return response.body.data.find((obj: any) => obj.id === ruleId);
    },
  };
}
