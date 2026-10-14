/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Agent as SuperTestAgent } from 'supertest';
import expect from '@kbn/expect';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ThresholdParams } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { refreshSavedObjectIndices } from './refresh_index';

export async function createIndexConnector({
  supertest,
  name,
  indexName,
  logger,
}: {
  supertest: SuperTestAgent;
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
  supertest: SuperTestAgent;
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
  const { body, status } = await supertest
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

  expect(status).to.eql(200, JSON.stringify(body));

  await refreshSavedObjectIndices(esClient);
  logger.debug(`Created rule id: ${body.id}`);
  return body;
}

export async function updateRule<Params = ThresholdParams>({
  supertest,
  ruleId,
  name,
  params,
  actions = [],
  tags = [],
  schedule,
  logger,
  esClient,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
  name: string;
  params: Params;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  logger: ToolingLog;
  esClient: Client;
}) {
  const { body, status } = await supertest
    .put(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .send({
      params,
      schedule: schedule || {
        interval: '5m',
      },
      tags,
      name,
      actions,
    });

  expect(status).to.eql(200, JSON.stringify(body));

  await refreshSavedObjectIndices(esClient);
  logger.debug(`Updated rule id: ${body.id}`);
  return body;
}
