/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export function AlertingApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const retry = getService('retry');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const config = getService('config');
  const retryTimeout = config.get('timeouts.try');
  const requestTimeout = 30 * 1000;
  const logger = getService('log');

  return {
    async waitForRuleStatus({
      ruleId,
      expectedStatus,
      roleAuthc,
    }: {
      ruleId: string;
      expectedStatus: string;
      roleAuthc: RoleCredentials;
    }) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await supertestWithoutAuth
          .get(`/api/alerting/rule/${ruleId}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
      roleAuthc,
    }: {
      indexName: string;
      docCountTarget?: number;
      roleAuthc: RoleCredentials;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
          index: indexName,
          rest_total_hits_as_int: true,
        });
        logger.debug(`Found ${response.hits.total} docs, looking for atleast ${docCountTarget}.`);
        if (!response.hits.total || response.hits.total < docCountTarget) {
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
      name,
      indexName,
      roleAuthc,
    }: {
      name: string;
      indexName: string;
      roleAuthc: RoleCredentials;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/actions/connector`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
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
      name,
      ruleTypeId,
      params,
      actions = [],
      tags = [],
      schedule,
      consumer,
      roleAuthc,
    }: {
      ruleTypeId: string;
      name: string;
      params: MetricThresholdParams | ThresholdParams | SloBurnRateRuleParams;
      actions?: any[];
      tags?: any[];
      schedule?: { interval: string };
      consumer: string;
      roleAuthc: RoleCredentials;
    }) {
      const { body } = await supertestWithoutAuth
        .post(`/api/alerting/rule`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
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

    async findRule(ruleId: string, roleAuthc: RoleCredentials) {
      if (!ruleId) {
        throw new Error(`'ruleId' is undefined`);
      }
      const response = await supertestWithoutAuth
        .get('/api/alerting/rules/_find')
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      return response.body.data.find((obj: any) => obj.id === ruleId);
    },
  };
}
