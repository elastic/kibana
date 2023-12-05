/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrSupertest } from '@kbn/ftr-common-functional-services';
import { ThresholdParams } from '@kbn/observability-plugin/common/custom_threshold_rule/types';

export async function createIndexConnector({
  supertest,
  name,
  indexName,
}: {
  supertest: FtrSupertest;
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

export async function createRule<Params = ThresholdParams>({
  supertest,
  name,
  ruleTypeId,
  params,
  actions = [],
  tags = [],
  schedule,
  consumer,
}: {
  supertest: FtrSupertest;
  ruleTypeId: string;
  name: string;
  params: Params;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  consumer: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
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
  if (body.statusCode) {
    expect(body.statusCode).eql(200, body.message);
  }
  return body;
}
