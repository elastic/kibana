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
    .map((_, idx) =>
      infra.dockerContainer(`container-id-${idx}`).defaults({
        'container.name': `container-id-${idx}`,
        'container.id': `container-id-${idx}`,
        'container.runtime': 'docker',
        'container.image.name': 'image-1',
        'host.name': 'host-1',
        'cloud.instance.id': 'instance-1',
        'cloud.image.id': 'image-1',
        'cloud.provider': 'aws',
        'event.dataset': 'docker.container',
      })
    );

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      containers.flatMap((container) => container.metrics().timestamp(timestamp))
    );
}
