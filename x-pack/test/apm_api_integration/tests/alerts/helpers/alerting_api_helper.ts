/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import pRetry from 'p-retry';
import type { Agent as SuperTestAgent } from 'supertest';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { ApmRuleParamsType } from '@kbn/apm-plugin/common/rules/schema';
import { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';

export const APM_ALERTS_INDEX = '.alerts-observability.apm.alerts-*';
export const APM_ACTION_VARIABLE_INDEX = 'apm-index-connector-test';

export async function createApmRule<T extends ApmRuleType>({
  supertest,
  name,
  ruleTypeId,
  params,
  actions = [],
}: {
  supertest: SuperTestAgent;
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
          interval: '5s',
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

export async function runRuleSoon({
  ruleId,
  supertest,
}: {
  ruleId: string;
  supertest: SuperTestAgent;
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

export async function deleteRuleById({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
}

export async function deleteApmRules(supertest: SuperTestAgent) {
  const res = await supertest.get(
    `/api/alerting/rules/_find?filter=alert.attributes.consumer:apm&per_page=10000`
  );

  return Promise.all(
    res.body.data.map((rule: any) => deleteRuleById({ supertest, ruleId: rule.id }))
  );
}

export async function deleteAllActionConnectors({
  supertest,
  es,
}: {
  supertest: SuperTestAgent;
  es: Client;
}): Promise<any> {
  const res = await supertest.get(`/api/actions/connectors`);

  const body = res.body as Array<{ id: string; connector_type_id: string; name: string }>;
  return Promise.all(
    body.map(({ id }) => {
      return deleteActionConnector({ supertest, actionId: id });
    })
  );
}

export type ApmAlertFields = ParsedTechnicalFields & ObservabilityApmAlert;

async function deleteActionConnector({
  supertest,
  actionId,
}: {
  supertest: SuperTestAgent;
  actionId: string;
}) {
  return supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
}
