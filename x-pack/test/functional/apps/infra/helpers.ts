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

export function generateHostData({
  from,
  to,
  count = 1,
}: {
  from: string;
  to: string;
  count: number;
}) {
  const range = timerange(from, to);

  const hosts = Array(count)
    .fill(0)
    .map((_, idx) => infra.host(`host-name-${idx}`));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap((host) => [
        host.cpu().timestamp(timestamp),
        host.memory().timestamp(timestamp),
        host.network().timestamp(timestamp),
        host.load().timestamp(timestamp),
        host.filesystem().timestamp(timestamp),
        host.diskio().timestamp(timestamp),
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
    .map((_, idx) => infra.pod(`pod-uid-${idx}`, `node-name-${idx}`));

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
