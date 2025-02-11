/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entities, apm, timerange, infra } from '@kbn/apm-synthtrace-client';
import { generateLongIdWithSeed } from '@kbn/apm-synthtrace-client/src/lib/utils/generate_id';

const SERVICE_ENTITY_ID = generateLongIdWithSeed('service');
const HOST_ENTITY_ID = generateLongIdWithSeed('host');
const CONTAINER_ENTITY_ID = generateLongIdWithSeed('container');

export const SERVICE_NAME = 'service-entity';
export const HOST_NAME = 'host-entity';
export const CONTAINER_ID = 'container-entity';

const AGENT_NAME = 'agentName';
const ENVIRONMENT = 'ENVIRONMENT_ALL';

export function generateEntities({ from, to }: { from: number; to: number }) {
  const service = entities.serviceEntity({
    serviceName: SERVICE_NAME,
    agentName: [AGENT_NAME],
    dataStreamType: ['logs'],
    entityId: SERVICE_ENTITY_ID,
  });

  const host = entities.hostEntity({
    hostName: HOST_NAME,
    agentName: [AGENT_NAME],
    dataStreamType: ['metrics'],
    entityId: HOST_ENTITY_ID,
  });

  const container = entities.containerEntity({
    containerId: CONTAINER_ID,
    agentName: [AGENT_NAME],
    dataStreamType: ['metrics'],
    entityId: CONTAINER_ENTITY_ID,
  });

  const range = timerange(from, to);

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return [
        service.timestamp(timestamp),
        host.timestamp(timestamp),
        container.timestamp(timestamp),
      ];
    });
}

export function generateTraces({ from, to }: { from: number; to: number }) {
  const synthNodeTraceLogs = apm
    .service({
      name: SERVICE_NAME,
      environment: ENVIRONMENT,
      agentName: AGENT_NAME,
    })
    .instance(HOST_NAME);

  const range = timerange(from, to);
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return [
        synthNodeTraceLogs
          .transaction({ transactionName: 't1' })
          .timestamp(timestamp)
          .duration(1000)
          .success(),
      ];
    });
}

export function generateHosts({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  const hosts: Array<{ hostName: string; cpuValue?: number }> = [
    {
      hostName: HOST_NAME,
      cpuValue: 0.5,
    },
  ];

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap(({ hostName, cpuValue }) => [
        infra.host(hostName).cpu({ cpuTotalValue: cpuValue }).timestamp(timestamp),
        infra.host(hostName).memory().timestamp(timestamp),
        infra.host(hostName).network().timestamp(timestamp),
        infra.host(hostName).load().timestamp(timestamp),
        infra.host(hostName).filesystem().timestamp(timestamp),
        infra.host(hostName).diskio().timestamp(timestamp),
        infra.host(hostName).core().timestamp(timestamp),
      ])
    );
}

const alertIndexes = [
  '.alerts-observability.apm.alerts-default',
  '.alerts-observability.uptime.alerts-default',
  '.alerts-observability.metrics.alerts-default',
  '.alerts-default.alerts-default',
  '.alerts-observability.logs.alerts-default',
  '.alerts-observability.slo.alerts-default',
  '.alerts-observability.threshold.alerts-default',
];

const entityIdentityFields = [
  {
    'service.name': SERVICE_NAME,
  },
  {
    'host.name': HOST_NAME,
  },
  {
    'container.id': CONTAINER_ID,
  },
];

export const cleanEntityAlerts = () => {
  entityIdentityFields.forEach((entityIdentityField) => {
    alertIndexes.forEach((index) => {
      cy.request({
        url: `/api/console/proxy?path=${index}%2F_delete_by_query&method=POST`,
        method: 'POST',
        body: {
          query: {
            match: {
              ...entityIdentityField,
            },
          },
        },
        headers: { 'kbn-xsrf': true },
      });
    });
  });
};

export const generateEntityAlerts = (start: string) => {
  entityIdentityFields.forEach((entityIdentityField) => {
    alertIndexes.forEach((index) => {
      cy.request({
        url: `/api/console/proxy?path=${index}%2F_doc&method=POST`,
        method: 'POST',
        body: alert({ entityIdentityField, start, index }),
        headers: { 'kbn-xsrf': true },
      });
    });
  });
};

const alert = ({ entityIdentityField, start, index }: any) => {
  return {
    'processor.event': 'transaction',
    'kibana.alert.evaluation.value': 1,
    'kibana.alert.evaluation.threshold': 10,
    'kibana.alert.reason': 'Test alert reason',
    'service.environment': 'ENVIRONMENT',
    ...entityIdentityField,
    'transaction.type': 'request',
    'kibana.alert.rule.category': 'Test rule category',
    'kibana.alert.rule.consumer': 'apm',
    'kibana.alert.rule.name': 'Test rule name',
    'kibana.alert.rule.parameters': {
      environment: 'ENVIRONMENT',
      threshold: 10,
      windowSize: 5,
      windowUnit: 'm',
    },
    'kibana.alert.rule.producer': 'apm',
    'kibana.alert.rule.revision': 0,
    'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
    'kibana.alert.rule.tags': ['apm'],
    'kibana.alert.rule.uuid': index,
    'kibana.space_ids': ['default'],
    '@timestamp': start,
    'event.action': 'active',
    'event.kind': 'signal',
    'kibana.alert.rule.execution.timestamp': start,
    'kibana.alert.action_group': 'threshold_met',
    'kibana.alert.flapping': true,
    'kibana.alert.flapping_history': [],
    'kibana.alert.maintenance_window_ids': [],
    'kibana.alert.consecutive_matches': 1,
    'kibana.alert.status': 'active',
    'kibana.alert.uuid': index,
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.duration.us': 3298850000,
    'kibana.alert.start': start,
    'kibana.alert.time_range': {
      gte: start,
    },
    tags: ['apm'],
    'kibana.alert.previous_action_group': 'threshold_met',
  };
};
