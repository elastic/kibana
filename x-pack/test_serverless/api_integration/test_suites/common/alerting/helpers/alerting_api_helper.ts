/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import type { SupertestWithoutAuthType } from '../../../../../shared/services';
import { RoleCredentials } from '../../../../../shared/services';
import { InternalRequestHeader } from '../../../../../shared/services';
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
  supertestWithoutAuth: SupertestWithoutAuthType;
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
  name,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  name: string;
}) {
  const { body } = await supertestWithoutAuth
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
  supertestWithoutAuth: SupertestWithoutAuthType;
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
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
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
  supertestWithoutAuth,
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
  supertestWithoutAuth: SupertestWithoutAuthType;
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
  const { body } = await supertestWithoutAuth
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
  supertestWithoutAuth,
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
  supertestWithoutAuth: SupertestWithoutAuthType;
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
  const { body } = await supertestWithoutAuth
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
  supertestWithoutAuth,
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
  supertestWithoutAuth: SupertestWithoutAuthType;
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
  const { body } = await supertestWithoutAuth
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
  supertestWithoutAuth,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/alerting/rule/${ruleId}/_disable`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function updateEsQueryRule({
  supertestWithoutAuth,
  ruleId,
  updates,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
  updates: any;
}) {
  const { body: r } = await supertestWithoutAuth
    .get(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(200);
  const body = await supertestWithoutAuth
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
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  const response = await supertestWithoutAuth
    .post(`/internal/alerting/rule/${ruleId}/_run_soon`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return response;
}

export async function muteRule({
  supertestWithoutAuth,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/alerting/rule/${ruleId}/_mute_all`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function enableRule({
  supertestWithoutAuth,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/alerting/rule/${ruleId}/_enable`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function muteAlert({
  supertestWithoutAuth,
  ruleId,
  alertId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
  alertId: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/alerting/rule/${ruleId}/alert/${alertId}/_mute`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function unmuteRule({
  supertestWithoutAuth,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  const { body } = await supertestWithoutAuth
    .post(`/api/alerting/rule/${ruleId}/_unmute_all`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo')
    .expect(204);
  return body;
}

export async function snoozeRule({
  supertestWithoutAuth,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  const { body } = await supertestWithoutAuth
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
  supertestWithoutAuth,
  ruleId,
}: {
  supertestWithoutAuth: SupertestWithoutAuthType;
  ruleId: string;
}) {
  if (!ruleId) {
    throw new Error(`'ruleId' is undefined`);
  }
  const response = await supertestWithoutAuth
    .get(`/api/alerting/rule/${ruleId}`)
    .set('kbn-xsrf', 'foo')
    .set('x-elastic-internal-origin', 'foo');
  return response.body || {};
}
