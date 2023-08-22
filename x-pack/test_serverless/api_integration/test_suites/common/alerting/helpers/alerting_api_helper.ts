/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuperTest, Test } from 'supertest';

interface CreateEsQueryRuleParams {
  size: number;
  thresholdComparator: string;
  threshold: number[];
  timeWindowSize?: number;
  timeWindowUnit?: string;
  esQuery?: string;
  timeField?: string;
  searchConfiguration?: unknown;
  indexName?: string;
  excludeHitsFromPreviousRun?: boolean;
  aggType?: string;
  aggField?: string;
  groupBy?: string;
  termField?: string;
  termSize?: number;
  index?: string[];
}

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
    .set('x-elastic-internal-origin', 'foo')
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

export async function createSlackConnector({
  supertest,
  name,
}: {
  supertest: SuperTest<Test>;
  name: string;
}) {
  const { body } = await supertest
    .post(`/api/actions/connector`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      name,
      config: {},
      secrets: {
        webhookUrl: 'http://test',
      },
      connector_type_id: '.slack',
    });
  return body.id as string;
}

export async function createEsQueryRule({
  supertest,
  name,
  ruleTypeId,
  params,
  actions = [],
  tags = [],
  schedule,
  consumer,
  notifyWhen,
  enabled = true,
}: {
  supertest: SuperTest<Test>;
  ruleTypeId: string;
  name: string;
  params: CreateEsQueryRuleParams;
  consumer: string;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  notifyWhen?: string;
  enabled?: boolean;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      enabled,
      params,
      consumer,
      schedule: schedule || {
        interval: '1h',
      },
      tags,
      name,
      rule_type_id: ruleTypeId,
      actions,
      ...(notifyWhen ? { notify_when: notifyWhen, throttle: '1m' } : {}),
    });
  return body;
}

export async function disableRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_disable`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return body;
}

export async function updateEsQueryRule({
  supertest,
  ruleId,
  updates,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
  updates: any;
}) {
  const { body: r } = await supertest
    .get(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  const body = await supertest
    .put(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      ...{
        name: r.name,
        schedule: r.schedule,
        throttle: r.throttle,
        tags: r.tags,
        params: r.params,
        notify_when: r.notifyWhen,
        actions: r.actions.map((action: any) => ({
          group: action.group,
          params: action.params,
          id: action.id,
          frequency: action.frequency,
        })),
      },
      ...updates,
    });
  return body;
}

export async function runRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return body;
}

export async function muteRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_mute_all`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return body;
}

export async function enableRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_enable`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return body;
}

export async function muteAlert({
  supertest,
  ruleId,
  alertId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
  alertId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/alert/${alertId}/_mute`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return body;
}

export async function unmuteRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTest<Test>;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_unmute_all`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return body;
}
