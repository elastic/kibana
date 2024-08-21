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
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../ftr_provider_context';

export interface SloBurnRateRuleParams {
  sloId: string;
  windows: WindowSchema[];
  dependencies?: Dependency[];
}

interface WindowSchema {
  id: string;
  burnRateThreshold: number;
  maxBurnRateThreshold: number;
  longWindow: Duration;
  shortWindow: Duration;
  actionGroup: string;
}

interface Dependency {
  ruleId: string;
  actionGroupsToSuppressOn: string[];
}

type DurationUnit = 'm' | 'h' | 'd' | 'w' | 'M';

interface Duration {
  value: number;
  unit: DurationUnit;
}

export function AlertingApiProvider({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');
  const logger = getService('log');
  const config = getService('config');
  const retryTimeout = config.get('timeouts.try');
  const requestTimeout = 30 * 1000;

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
    }: {
      indexName: string;
      docCountTarget?: number;
    }): Promise<SearchResponse<T, Record<string, AggregationsAggregate>>> {
      return await retry.tryForTime(retryTimeout, async () => {
        const response = await es.search<T>({
          index: indexName,
          rest_total_hits_as_int: true,
        });
        logger.debug(`Found ${response.hits.total} docs, looking for at least ${docCountTarget}.`);

        if (
          !response.hits.total ||
          (typeof response.hits.total === 'number'
            ? response.hits.total < docCountTarget
            : response.hits.total.value < docCountTarget)
        ) {
          throw new Error('No hits or not enough hits found');
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
      const response = await supertestWithoutAuth
        .get('/api/alerting/rules/_find')
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      return response.body.data.find((obj: any) => obj.id === ruleId);
    },
  };
}
