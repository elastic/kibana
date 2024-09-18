/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange, infra, generateShortId, log } from '@kbn/apm-synthtrace-client';

const SERVICE_PREFIX = 'service';
// generates traces, metrics for services
export function generateAddServicesToExistingHost({
  from,
  to,
  hostName,
  servicesPerHost = 1,
}: {
  from: string;
  to: string;
  hostName: string;
  servicesPerHost?: number;
}) {
  const range = timerange(from, to);
  const services = Array(servicesPerHost)
    .fill(null)
    .map((_, serviceIdx) =>
      apm
        .service({
          name: `${SERVICE_PREFIX}-${serviceIdx}`,
          environment: 'production',
          agentName: 'nodejs',
        })
        .instance(hostName)
    );

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp, index) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}

export function generateDockerContainersData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count?: number;
}) {
  const range = timerange(from, to);

  const containers = Array(count)
    .fill(0)
    .map((_, idx) => infra.dockerContainer(`container-id-${idx}`));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      containers.flatMap((container) => container.metrics().timestamp(timestamp))
    );
}

export function generateHostData({
  from,
  to,
  hosts,
}: {
  from: string;
  to: string;
  hosts: Array<{ hostName: string; cpuValue: number }>;
}) {
  const range = timerange(from, to);

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

export function generateHostsWithK8sNodeData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  // cpuValue is sent to the generator to simulate different 'system.cpu.total.norm.pct' metric
  // that is the default metric in inventory and hosts view and host details page
  const hosts = [
    {
      hostName: 'demo-stack-kubernetes-01',
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
        infra.host(hostName).node('demo-stack-kubernetes-01').metrics().timestamp(timestamp),
        infra.host(hostName).pod('pod-1').metrics().timestamp(timestamp),
      ])
    );
}

export function generatePodsData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const pods = Array(count)
    .fill(0)
    .map((_, idx) => infra.pod(`pod-${idx}`, `node-name-${idx}`));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      pods.flatMap((pod, idx) => [
        pod.metrics().timestamp(timestamp),
        pod.container(`container-${idx}`).metrics().timestamp(timestamp),
      ])
    );
}

export function generateLogsDataForHosts({
  from,
  to,
  hosts,
}: {
  from: string;
  to: string;
  hosts: Array<{ hostName: string }>;
}) {
  const range = timerange(from, to);

  // Logs Data logic
  const MESSAGE_LOG_LEVELS = [
    { message: 'A simple log', level: 'info' },
    { message: 'Yet another debug log', level: 'debug' },
    { message: 'Error with certificate: "ca_trusted_fingerprint"', level: 'error' },
  ];
  const CLOUD_PROVIDERS = ['gcp', 'aws', 'azure'];
  const CLOUD_REGION = ['eu-central-1', 'us-east-1', 'area-51'];

  const CLUSTER = [
    { clusterId: generateShortId(), clusterName: 'synth-cluster-1' },
    { clusterId: generateShortId(), clusterName: 'synth-cluster-2' },
    { clusterId: generateShortId(), clusterName: 'synth-cluster-3' },
  ];

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap(({ hostName }) => {
        const index = Math.floor(Math.random() * MESSAGE_LOG_LEVELS.length);
        return log
          .create()
          .message(MESSAGE_LOG_LEVELS[index].message)
          .logLevel(MESSAGE_LOG_LEVELS[index].level)
          .hostName(hostName)
          .defaults({
            'trace.id': generateShortId(),
            'agent.name': 'synth-agent',
            'orchestrator.cluster.name': CLUSTER[index].clusterName,
            'orchestrator.cluster.id': CLUSTER[index].clusterId,
            'orchestrator.resource.id': generateShortId(),
            'cloud.provider': CLOUD_PROVIDERS[index],
            'cloud.region': CLOUD_REGION[index],
            'cloud.availability_zone': `${CLOUD_REGION[index]}a`,
            'cloud.project.id': generateShortId(),
            'cloud.instance.id': generateShortId(),
            'log.file.path': `/logs/${generateShortId()}/error.txt`,
          })
          .timestamp(timestamp);
      })
    );
}
