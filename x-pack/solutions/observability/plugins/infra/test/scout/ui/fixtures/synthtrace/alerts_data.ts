/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ObltWorkerFixtures } from '@kbn/scout-oblt';
import { faker } from '@faker-js/faker';

const ALERTS_INDEX_PATTERN = '.alerts-observability.metrics.alerts-*';
const ALERTS_WRITE_TARGET = '.alerts-observability.metrics.alerts-default';

const RULE_TAG = 'infra-hosts-scout-test';

interface AlertDocumentParams {
  hostName: string;
  status: 'active' | 'recovered';
  alertStartTime: string;
  endTime?: string;
  ruleUuid: string;
}

const createAlertDocument = ({
  hostName,
  status,
  alertStartTime,
  endTime,
  ruleUuid,
}: AlertDocumentParams) => ({
  '@timestamp': new Date().toISOString(),
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
  'kibana.alert.start': alertStartTime,
  ...(endTime && { 'kibana.alert.end': endTime }),
  'kibana.alert.status': status,
  'kibana.alert.time_range': { gte: alertStartTime },
  'kibana.alert.uuid': faker.string.uuid(),
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

  const operations = alertDocs.flatMap((doc) => [
    { create: { _index: ALERTS_WRITE_TARGET } },
    createAlertDocument({
      hostName: doc.hostName,
      status: doc.status,
      alertStartTime: timestamp,
      ruleUuid,
      ...(doc.status === 'recovered' && {
        endTime: new Date(new Date(timestamp).getTime() + 60000).toISOString(),
      }),
    }),
  ]);

  const bulkResponse = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (bulkResponse.errors) {
    const failures = bulkResponse.items
      .filter((item) => item.create?.error)
      .map((item) => item.create!.error!.reason);
    throw new Error(`Failed to ingest alert documents: ${failures.join('; ')}`);
  }
};

export const cleanAlertsData = async ({
  esClient,
  apiServices,
}: {
  esClient: EsClient;
  apiServices: ObltWorkerFixtures['apiServices'];
}): Promise<void> => {
  await apiServices.alerting.cleanup.deleteRulesByTags([RULE_TAG]);

  await esClient
    .deleteByQuery({
      index: ALERTS_INDEX_PATTERN,
      query: {
        term: { tags: RULE_TAG },
      },
      refresh: true,
      conflicts: 'proceed',
    })
    .catch(() => {});
};
