/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SuperTest, Test } from 'supertest';
import { ToolingLog } from '@kbn/tooling-log';
import { ThresholdParams } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { refreshSavedObjectIndices } from './refresh_index';

export async function createIndexConnector({
  supertest,
  name,
  indexName,
  logger,
}: {
  supertest: SuperTest<Test>;
  name: string;
  indexName: string;
  logger: ToolingLog;
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
    })
    .expect(200);

  logger.debug(`Created index connector id: ${body.id}`);
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
  logger,
  esClient,
}: {
  supertest: SuperTest<Test>;
  ruleTypeId: string;
  name: string;
  params: Params;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  consumer: string;
  logger: ToolingLog;
  esClient: Client;
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
    })
    .expect(200);

  await refreshSavedObjectIndices(esClient);
  logger.debug(`Created rule id: ${body.id}`);
  return body;
}
