/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import type { EsClient, ObltWorkerFixtures } from '@kbn/scout-oblt';

const ALERTS_INDEX = '.internal.alerts-observability.metrics.alerts-default-000001';
const ALERTS_ALIAS = '.alerts-observability.metrics.alerts-default';

const RULE_TAG = 'infra-hosts-scout-test';

interface AlertDocumentParams {
  hostName: string;
  status: 'active' | 'recovered';
  timestamp: string;
  startTime: string;
  endTime?: string;
  ruleUuid: string;
}

const createAlertDocument = ({
  hostName,
  status,
  timestamp,
  startTime,
  endTime,
  ruleUuid,
}: AlertDocumentParams) => ({
  '@timestamp': timestamp,
  'event.action': status === 'active' ? 'active' : 'close',
  'event.kind': 'signal',
  'kibana.alert.duration.us': 63291000,
  'kibana.alert.instance.id': hostName,
  'host.name': hostName,
  'kibana.alert.reason': `CPU usage is greater than a threshold of 40 for ${hostName}`,
  'kibana.alert.rule.category': 'Inventory',
  'kibana.alert.rule.consumer': 'infrastructure',
  'kibana.alert.rule.name': 'hosts-cpu-alert-test',
  'kibana.alert.rule.producer': 'infrastructure',
  'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
  'kibana.alert.rule.uuid': ruleUuid,
  'kibana.alert.start': startTime,
  ...(endTime && { 'kibana.alert.end': endTime }),
  'kibana.alert.status': status,
  'kibana.alert.time_range': { gte: startTime },
  'kibana.alert.uuid': crypto.randomUUID(),
  'kibana.alert.workflow_status': 'open',
  'kibana.space_ids': ['default'],
  'kibana.version': '8.0.0',
  tags: [RULE_TAG],
});

export const ACTIVE_ALERTS = 6;
export const RECOVERED_ALERTS = 4;
export const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;

export const ingestAlertsData = async ({
  esClient,
  apiServices,
  hosts,
  timestamp,
}: {
  esClient: EsClient;
  apiServices: ObltWorkerFixtures['apiServices'];
  hosts: string[];
  timestamp: string;
}): Promise<void> => {
  const ruleResponse = await apiServices.alerting.rules.create({
    ruleTypeId: 'metrics.alert.inventory.threshold',
    name: `hosts-cpu-alert-test-${Date.now()}`,
    consumer: 'infrastructure',
    schedule: { interval: '1m' },
    enabled: false,
    params: {
      criteria: [
        {
          metric: 'cpu',
          comparator: '>',
          threshold: [40],
          timeSize: 1,
          timeUnit: 'm',
        },
      ],
      nodeType: 'host',
      sourceId: 'default',
    },
    tags: [RULE_TAG],
  });

  const ruleUuid = ruleResponse.data.id;

  const aliasOrIndexExists = await esClient.indices.exists({ index: ALERTS_ALIAS });
  const backingIndexExists = await esClient.indices.exists({ index: ALERTS_INDEX });

  if (!aliasOrIndexExists && !backingIndexExists) {
    await esClient.indices.create({
      index: ALERTS_INDEX,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      aliases: {
        [ALERTS_ALIAS]: { is_write_index: true },
      },
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': { type: 'date' },
          'host.name': { type: 'keyword' },
          'event.action': { type: 'keyword' },
          'event.kind': { type: 'keyword' },
          'kibana.alert.duration.us': { type: 'long' },
          'kibana.alert.end': { type: 'date' },
          'kibana.alert.instance.id': { type: 'keyword' },
          'kibana.alert.reason': { type: 'text' },
          'kibana.alert.rule.category': { type: 'keyword' },
          'kibana.alert.rule.consumer': { type: 'keyword' },
          'kibana.alert.rule.name': { type: 'keyword' },
          'kibana.alert.rule.producer': { type: 'keyword' },
          'kibana.alert.rule.rule_type_id': { type: 'keyword' },
          'kibana.alert.rule.uuid': { type: 'keyword' },
          'kibana.alert.start': { type: 'date' },
          'kibana.alert.status': { type: 'keyword' },
          'kibana.alert.time_range': {
            type: 'date_range',
            format: 'epoch_millis||strict_date_optional_time',
          },
          'kibana.alert.uuid': { type: 'keyword' },
          'kibana.alert.workflow_status': { type: 'keyword' },
          'kibana.space_ids': { type: 'keyword' },
          'kibana.version': { type: 'keyword' },
          tags: { type: 'keyword' },
        },
      },
    });
  }

  const alertDocs: Array<{ hostName: string; status: 'active' | 'recovered' }> = [];

  // 6 active alerts: 2 for each of the first 3 hosts
  for (const hostName of hosts.slice(0, 3)) {
    alertDocs.push({ hostName, status: 'active' });
    alertDocs.push({ hostName, status: 'active' });
  }

  // 4 recovered alerts: distributed across first 3 hosts + one extra
  alertDocs.push({ hostName: hosts[0], status: 'recovered' });
  alertDocs.push({ hostName: hosts[1], status: 'recovered' });
  alertDocs.push({ hostName: hosts[2], status: 'recovered' });
  alertDocs.push({ hostName: hosts[0], status: 'recovered' });

  const writeTarget = aliasOrIndexExists ? ALERTS_ALIAS : ALERTS_INDEX;
  const operations = alertDocs.flatMap((doc) => [
    { index: { _index: writeTarget } },
    createAlertDocument({
      hostName: doc.hostName,
      status: doc.status,
      timestamp,
      startTime: timestamp,
      ruleUuid,
      ...(doc.status === 'recovered' && {
        endTime: new Date(new Date(timestamp).getTime() + 60000).toISOString(),
      }),
    }),
  ]);

  await esClient.bulk({ operations, refresh: 'wait_for' });
};

export const cleanAlertsData = async ({
  esClient,
  apiServices,
}: {
  esClient: EsClient;
  apiServices: ObltWorkerFixtures['apiServices'];
}): Promise<void> => {
  await apiServices.alerting.cleanup.deleteRulesByTags([RULE_TAG]);

  const backingIndexExists = await esClient.indices.exists({ index: ALERTS_INDEX });
  if (backingIndexExists) {
    const aliasResponse = await esClient.indices
      .getAlias({ index: ALERTS_INDEX })
      .catch(() => null);
    const weOwnTheIndex =
      aliasResponse != null && ALERTS_ALIAS in (aliasResponse[ALERTS_INDEX]?.aliases ?? {});

    if (weOwnTheIndex) {
      await esClient.indices.delete({ index: ALERTS_INDEX });
      return;
    }
  }

  await esClient
    .deleteByQuery({
      index: ALERTS_ALIAS,
      query: {
        term: { tags: RULE_TAG },
      },
      refresh: true,
    })
    .catch(() => {});
};
