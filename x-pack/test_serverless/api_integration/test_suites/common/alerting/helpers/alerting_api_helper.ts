/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import type { Agent as SuperTestAgent } from 'supertest';
import {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '../../../../../shared/services';

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
  supertestWithoutAuth,
  roleAuthc,
  internalReqHeader,
  name,
  indexName,
}: {
  supertestWithoutAuth: SupertestWithoutAuthProviderType;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  name: string;
  indexName: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/actions/connector`)
    .set(internalReqHeader)
    .set(roleAuthc.apiKeyHeader)
    .send({
      name,
      config: {
        index: indexName,
        refresh: true,
      },
      connector_type_id: '.index',
    })
    .expect(200);
  return body;
}

export async function createSlackConnector({
  supertestWithoutAuth,
  roleAuthc,
  internalReqHeader,
  name,
}: {
  supertestWithoutAuth: SupertestWithoutAuthProviderType;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  name: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/actions/connector`)
    .set(internalReqHeader)
    .set(roleAuthc.apiKeyHeader)
    .send({
      name,
      config: {},
      secrets: {
        webhookUrl: 'http://test',
      },
      connector_type_id: '.slack',
    })
    .expect(200);
  return body;
}

export async function createEsQueryRule({
  supertestWithoutAuth,
  roleAuthc,
  internalReqHeader,
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
  supertestWithoutAuth: SupertestWithoutAuthProviderType;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
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
  const { body } = await supertestWithoutAuth
    .post(`/api/alerting/rule`)
    .set(internalReqHeader)
    .set(roleAuthc.apiKeyHeader)
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
      ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
    })
    .expect(200);
  return body;
}

export const generateUniqueKey = () => uuidv4().replace(/-/g, '');

export async function createAnomalyRule({
  supertest,
  name = generateUniqueKey(),
  actions = [],
  tags = ['foo', 'bar'],
  schedule,
  consumer = 'alerts',
  notifyWhen,
  enabled = true,
  ruleTypeId = 'apm.anomaly',
  params,
}: {
  supertest: SuperTestAgent;
  name?: string;
  consumer?: string;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  notifyWhen?: string;
  enabled?: boolean;
  ruleTypeId?: string;
  params?: any;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      enabled,
      params: params || {
        anomalySeverityType: 'critical',
        anomalyDetectorTypes: ['txLatency'],
        environment: 'ENVIRONMENT_ALL',
        windowSize: 30,
        windowUnit: 'm',
      },
      consumer,
      schedule: schedule || {
        interval: '1m',
      },
      tags,
      name,
      rule_type_id: ruleTypeId,
      actions,
      ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
    })
    .expect(200);
  return body;
}

export async function createLatencyThresholdRule({
  supertest,
  name = generateUniqueKey(),
  actions = [],
  tags = ['foo', 'bar'],
  schedule,
  consumer = 'apm',
  notifyWhen,
  enabled = true,
  ruleTypeId = 'apm.transaction_duration',
  params,
}: {
  supertest: SuperTestAgent;
  name?: string;
  consumer?: string;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  notifyWhen?: string;
  enabled?: boolean;
  ruleTypeId?: string;
  params?: any;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      enabled,
      params: params || {
        aggregationType: 'avg',
        environment: 'ENVIRONMENT_ALL',
        threshold: 1500,
        windowSize: 5,
        windowUnit: 'm',
      },
      consumer,
      schedule: schedule || {
        interval: '1m',
      },
      tags,
      name,
      rule_type_id: ruleTypeId,
      actions,
      ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
    });
  return body;
}

export async function createInventoryRule({
  supertest,
  name = generateUniqueKey(),
  actions = [],
  tags = ['foo', 'bar'],
  schedule,
  consumer = 'alerts',
  notifyWhen,
  enabled = true,
  ruleTypeId = 'metrics.alert.inventory.threshold',
  params,
}: {
  supertest: SuperTestAgent;
  name?: string;
  consumer?: string;
  actions?: any[];
  tags?: any[];
  schedule?: { interval: string };
  notifyWhen?: string;
  enabled?: boolean;
  ruleTypeId?: string;
  params?: any;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      enabled,
      params: params || {
        nodeType: 'host',
        criteria: [
          {
            metric: 'cpu',
            comparator: '>',
            threshold: [5],
            timeSize: 1,
            timeUnit: 'm',
            customMetric: {
              type: 'custom',
              id: 'alert-custom-metric',
              field: '',
              aggregation: 'avg',
            },
          },
        ],
        sourceId: 'default',
      },
      consumer,
      schedule: schedule || {
        interval: '1m',
      },
      tags,
      name,
      rule_type_id: ruleTypeId,
      actions,
      ...(notifyWhen ? { notify_when: notifyWhen, throttle: '5m' } : {}),
    })
    .expect(200);
  return body;
}

export async function disableRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_disable`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function updateEsQueryRule({
  supertest,
  ruleId,
  updates,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
  updates: any;
}) {
  const { body: r } = await supertest
    .get(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(200);
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
    })
    .expect(200);
  return body;
}

export async function runRule({
  supertestWithoutAuth,
  roleAuthc,
  internalReqHeader,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthProviderType;
  roleAuthc: RoleCredentials;
  internalReqHeader: InternalRequestHeader;
  ruleId: string;
}) {
  const response = await supertestWithoutAuth
    .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
    .set(internalReqHeader)
    .set(roleAuthc.apiKeyHeader)
    .expect(204);
  return response;
}

export async function muteRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_mute_all`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function enableRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_enable`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function muteAlert({
  supertest,
  ruleId,
  alertId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
  alertId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/alert/${alertId}/_mute`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function unmuteRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/api/alerting/rule/${ruleId}/_unmute_all`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function snoozeRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  const { body } = await supertest
    .post(`/internal/alerting/rule/${ruleId}/_snooze`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .send({
      snooze_schedule: {
        duration: 100000000,
        rRule: {
          count: 1,
          dtstart: moment().format(),
          tzid: 'UTC',
        },
      },
    })
    .expect(204);
  return body;
}

export async function findRule({
  supertest,
  ruleId,
}: {
  supertest: SuperTestAgent;
  ruleId: string;
}) {
  if (!ruleId) {
    throw new Error(`'ruleId' is undefined`);
  }
  const response = await supertest
    .get(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return response.body || {};
}
