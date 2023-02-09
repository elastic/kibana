/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest, Test } from 'supertest';
import { ApmRuleType } from '@kbn/apm-plugin/common/rules/apm_rule_types';
import { ApmRuleParamsType } from '@kbn/apm-plugin/common/rules/schema';

export async function createIndexConnector({
  supertest,
  name,
  indexName,
}: {
  supertest: SuperTest<Test>;
  name: string;
  indexName: string;
}) {
  const { body: createdAction } = await supertest
    .post(`/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .send({
      name,
      config: {
        index: indexName,
        refresh: true,
      },
      connector_type_id: '.index',
    });
  return createdAction.id as string;
}

export async function createAlertingRule<T extends ApmRuleType>({
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
  const { body: createdRule } = await supertest
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
  return createdRule;
}
