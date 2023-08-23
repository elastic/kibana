/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, errors } from '@elastic/elasticsearch';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import pRetry from 'p-retry';
import type { SuperTest, Test } from 'supertest';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleParamsType } from '@kbn/apm-plugin/common/rules/schema';
import { ApmDocumentType } from '@kbn/apm-plugin/common/document_type';
import { RollupInterval } from '@kbn/apm-plugin/common/rollup';
import { ApmApiClient } from '../../../common/config';

export const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-*';

export async function createApmRule<T extends ApmRuleType>({
  supertest,
  name,
  ruleTypeId,
  params,
  actions = [],
}: {
  supertest: SuperTest<Test>;
  ruleTypeId: T;
  name: string;
  params: ApmRuleParamsType[T];
  actions?: any[];
}) {
  try {
    const { body } = await supertest
      .post(`/api/alerting/rule`)
      .set('kbn-xsrf', 'foo')
      .send({
        params,
        consumer: 'apm',
        schedule: {
          interval: '1m',
        },
        tags: ['apm'],
        name,
        rule_type_id: ruleTypeId,
        actions,
      });
    return body;
  } catch (error: any) {
    throw new Error(`[Rule] Creating a rule failed: ${error}`);
  }
}

function getTimerange() {
  return {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}

export async function fetchServiceInventoryAlertCounts(apmApiClient: ApmApiClient) {
  const timerange = getTimerange();
  const serviceInventoryResponse = await apmApiClient.readUser({
    endpoint: 'GET /internal/apm/services',
    params: {
      query: {
        ...timerange,
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
        probability: 1,
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval: RollupInterval.SixtyMinutes,
      },
    },
  });

  return serviceInventoryResponse.body.items.reduce<Record<string, number>>((acc, item) => {
    return { ...acc, [item.serviceName]: item.alertsCount ?? 0 };
  }, {});
}

export async function fetchServiceTabAlertCount({
  apmApiClient,
  serviceName,
}: {
  apmApiClient: ApmApiClient;
  serviceName: string;
}) {
  const timerange = getTimerange();
  const alertsCountReponse = await apmApiClient.readUser({
    endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
    params: {
      path: {
        serviceName,
      },
      query: {
        ...timerange,
        environment: 'ENVIRONMENT_ALL',
      },
    },
  });

  return alertsCountReponse.body.alertsCount;
}

export async function runRuleSoon({
  ruleId,
  supertest,
}: {
  ruleId: string;
  supertest: SuperTest<Test>;
}): Promise<Record<string, any>> {
  return pRetry(
    async () => {
      try {
        const response = await supertest
          .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        // Sometimes the rule may already be running, which returns a 200. Try until it isn't
        if (response.status !== 204) {
          throw new Error(`runRuleSoon got ${response.status} status`);
        }
        return response;
      } catch (error) {
        throw new Error(`[Rule] Running a rule ${ruleId} failed: ${error}`);
      }
    },
    { retries: 10 }
  );
}

export async function deleteAlertsByRuleId({ es, ruleId }: { es: Client; ruleId: string }) {
  await es.deleteByQuery({
    index: APM_ALERTS_INDEX,
    query: { term: { 'kibana.alert.rule.uuid': ruleId } },
  });
}

export async function deleteRuleById({
  supertest,
  ruleId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
}) {
  await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
}

export async function deleteApmRules(supertest: SuperTest<Test>) {
  const res = await supertest.get(
    `/api/alerting/rules/_find?filter=alert.attributes.consumer:apm&per_page=10000`
  );

  return Promise.all(
    res.body.data.map(async (rule: any) => {
      await supertest.delete(`/api/alerting/rule/${rule.id}`).set('kbn-xsrf', 'foo');
    })
  );
}

export function deleteApmAlerts(es: Client) {
  return es.deleteByQuery({ index: APM_ALERTS_INDEX, query: { match_all: {} } });
}

export async function clearKibanaApmEventLog(es: Client) {
  return es.deleteByQuery({
    index: '.kibana-event-log-*',
    query: { term: { 'kibana.alert.rule.consumer': 'apm' } },
  });
}

export type ApmAlertFields = ParsedTechnicalFields & {
  'service.name': string;
  'service.environment': string;
  'transaction.name': string;
  'error.grouping_key': string;
  'error.grouping_name': string;
};

const APM_ACTION_VARIABLE_INDEX = 'apm-index-connector-test';

export async function createIndexConnector({
  supertest,
  name,
}: {
  supertest: SuperTest<Test>;
  name: string;
}) {
  const { body } = await supertest
    .post(`/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name,
      config: {
        index: APM_ACTION_VARIABLE_INDEX,
        refresh: true,
      },
      connector_type_id: '.index',
    });
  return body.id as string;
}

export function getIndexAction({
  actionId,
  actionVariables,
}: {
  actionId: string;
  actionVariables: Array<{ name: string }>;
}) {
  return {
    group: 'threshold_met',
    id: actionId,
    params: {
      documents: [
        actionVariables.reduce<Record<string, string>>((acc, actionVariable) => {
          acc[actionVariable.name] = `{{context.${actionVariable.name}}}`;
          return acc;
        }, {}),
      ],
    },
    frequency: {
      notify_when: 'onActionGroupChange',
      throttle: null,
      summary: false,
    },
  };
}

export async function deleteActionConnector({
  supertest,
  es,
  actionId,
}: {
  supertest: SuperTest<Test>;
  es: Client;
  actionId: string;
}) {
  return Promise.all([
    await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo'),
    await deleteActionConnectorIndex(es),
  ]);
}

export async function deleteActionConnectorIndex(es: Client) {
  try {
    await es.indices.delete({ index: APM_ACTION_VARIABLE_INDEX });
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      return;
    }

    throw e;
  }
}

export async function getIndexConnectorResults(es: Client) {
  return pRetry(async () => {
    const res = await es.search({ index: APM_ACTION_VARIABLE_INDEX });
    return res.hits.hits.map((hit) => hit._source) as Array<Record<string, string>>;
  });
}
