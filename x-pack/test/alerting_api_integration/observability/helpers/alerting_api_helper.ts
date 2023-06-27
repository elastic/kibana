/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraRuleType, InfraRuleTypeParams } from '@kbn/infra-plugin/common/alerting/metrics';
import type { SuperTest, Test } from 'supertest';

export async function createIndexConnector({
  supertest,
  name,
  indexName,
}: {
  supertest: SuperTest<Test>;
  name: string;
  indexName: string;
}) {
  const { body } = await supertest
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
  return body.id as string;
}

export async function createMetricThresholdRule<T extends InfraRuleType>({
  supertest,
  name,
  ruleTypeId,
  params,
  actions = [],
  schedule,
}: {
  supertest: SuperTest<Test>;
  ruleTypeId: T;
  name: string;
  params: InfraRuleTypeParams[T];
  actions?: any[];
  schedule?: { interval: string };
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .send({
      params,
      consumer: 'infrastructure',
      schedule: schedule || {
        interval: '5m',
      },
      tags: ['infrastructure'],
      name,
      rule_type_id: ruleTypeId,
      actions,
    });
  return body;
}
