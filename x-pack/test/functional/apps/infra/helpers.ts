/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange, infra } from '@kbn/apm-synthtrace-client';

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

export function generateHostData({ from, to }: { from: string; to: string }) {
  const range = timerange(from, to);

  // cpuValue is sent to the generator to simulate different 'system.cpu.total.norm.pct' metric
  // that is the default metric in inventory and hosts view and host details page
  const hosts = [
    {
      hostName: 'host-1',
      cpuValue: 0.5,
    },
    {
      hostName: 'host-2',
      cpuValue: 0.7,
    },
    {
      hostName: 'host-3',
      cpuValue: 0.9,
    },
    {
      hostName: 'host-4',
      cpuValue: 0.3,
    },
    {
      hostName: 'host-5',
      cpuValue: 0.1,
    },
  ];

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap(({ hostName, cpuValue }) => [
        infra.host(hostName).cpu(cpuValue).timestamp(timestamp),
        infra.host(hostName).memory().timestamp(timestamp),
        infra.host(hostName).network().timestamp(timestamp),
        infra.host(hostName).load().timestamp(timestamp),
        infra.host(hostName).filesystem().timestamp(timestamp),
        infra.host(hostName).diskio().timestamp(timestamp),
        infra.host(hostName).core().timestamp(timestamp),
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
