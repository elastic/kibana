/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, entities, log, timerange } from '@kbn/apm-synthtrace-client';
import { generateLongIdWithSeed } from '@kbn/apm-synthtrace-client/src/lib/utils/generate_id';

const SYNTH_NODE_TRACES_LOGS_ENTITY_ID = generateLongIdWithSeed('service');
const SERVICE_LOGS_ONLY_ENTITY_ID = generateLongIdWithSeed('service-logs-only');
const HOST_SERVER_1_LOGS_ENTITY_ID = generateLongIdWithSeed('host');
const CONTAINER_ID_METRICS_ENTITY_ID = generateLongIdWithSeed('container');

const SYNTH_NODE_TRACE_LOGS = 'synth-node-trace-logs';
const SERVICE_LOGS_ONLY = 'service-logs-only';
const HOST_NAME = 'server1';
const CONTAINER_ID = 'foo';

const ENVIRONMENT = 'test';

export function generateEntities({ from, to }: { from: number; to: number }) {
  const serviceSynthNodeTracesLogs = entities.serviceEntity({
    serviceName: SYNTH_NODE_TRACE_LOGS,
    agentName: ['nodejs'],
    dataStreamType: ['traces', 'logs'],
    environment: ENVIRONMENT,
    entityId: SYNTH_NODE_TRACES_LOGS_ENTITY_ID,
  });

  const serviceLogsOnly = entities.serviceEntity({
    serviceName: SERVICE_LOGS_ONLY,
    agentName: ['host'],
    dataStreamType: ['logs'],
    entityId: SERVICE_LOGS_ONLY_ENTITY_ID,
  });

  const hostServer1Logs = entities.hostEntity({
    hostName: HOST_NAME,
    agentName: ['nodejs'],
    dataStreamType: ['logs'],
    entityId: HOST_SERVER_1_LOGS_ENTITY_ID,
  });

  const containerMetrics = entities.containerEntity({
    containerId: CONTAINER_ID,
    agentName: ['filebeat'],
    dataStreamType: ['metrics'],
    entityId: CONTAINER_ID_METRICS_ENTITY_ID,
  });

  const range = timerange(from, to);

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return [
        serviceSynthNodeTracesLogs.timestamp(timestamp),
        serviceLogsOnly.timestamp(timestamp),
        hostServer1Logs.timestamp(timestamp),
        containerMetrics.timestamp(timestamp),
      ];
    });
}

export function generateTraces({ from, to }: { from: number; to: number }) {
  const synthNodeTraceLogs = apm
    .service({
      name: SYNTH_NODE_TRACE_LOGS,
      environment: ENVIRONMENT,
      agentName: 'nodejs',
    })
    .instance('instance_1');

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

const MESSAGE_LOG_LEVELS = [
  { message: 'A simple log', level: 'info' },
  { message: 'Yet another debug log', level: 'debug' },
  { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
];
export function generateLogs({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return [
        ...Array(3)
          .fill(0)
          .map(() => {
            const index = Math.floor(Math.random() * 3);
            const logMessage = MESSAGE_LOG_LEVELS[index];

            return log
              .create({ isLogsDb: false })
              .service(SYNTH_NODE_TRACE_LOGS)
              .message(logMessage.message)
              .logLevel(logMessage.level)
              .setGeoLocation([1])
              .setHostIp('223.72.43.22')
              .defaults({
                'agent.name': 'nodejs',
              })
              .timestamp(timestamp);
          }),
        ...Array(3)
          .fill(0)
          .map(() => {
            const index = Math.floor(Math.random() * 3);
            const logMessage = MESSAGE_LOG_LEVELS[index];

            return log
              .create({ isLogsDb: false })
              .service(SERVICE_LOGS_ONLY)
              .message(logMessage.message)
              .logLevel(logMessage.level)
              .setGeoLocation([1])
              .setHostIp('223.72.43.22')
              .defaults({
                'agent.name': 'nodejs',
              })
              .timestamp(timestamp);
          }),
      ];
    });
}
