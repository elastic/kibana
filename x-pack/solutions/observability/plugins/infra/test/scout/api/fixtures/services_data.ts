/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/synthtrace-client';

export function generateServicesData({
  from,
  to,
  instanceCount = 1,
  servicesPerHost = 1,
}: {
  from: string;
  to: string;
  instanceCount?: number;
  servicesPerHost?: number;
}) {
  const range = timerange(from, to);
  const services = Array(instanceCount)
    .fill(null)
    .flatMap((_, hostIdx) =>
      Array(servicesPerHost)
        .fill(null)
        .map((__, serviceIdx) =>
          apm
            .service({
              name: `service-${hostIdx}-${serviceIdx}`,
              environment: 'production',
              agentName: 'nodejs',
            })
            .instance(`host-${hostIdx}`)
        )
    );
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      services.map((service) =>
        service
          .transaction({ transactionName: 'GET /foo' })
          .timestamp(timestamp)
          .duration(500)
          .success()
      )
    );
}

/** Generates error logs only for services (no transactions). */
export function generateServicesLogsOnlyData({
  from,
  to,
  instanceCount = 1,
  servicesPerHost = 1,
}: {
  from: string;
  to: string;
  instanceCount?: number;
  servicesPerHost?: number;
}) {
  const range = timerange(from, to);
  const services = Array(instanceCount)
    .fill(null)
    .flatMap((_, hostIdx) =>
      Array(servicesPerHost)
        .fill(null)
        .map((__, serviceIdx) =>
          apm
            .service({
              name: `service-${hostIdx}-${serviceIdx}`,
              environment: 'production',
              agentName: 'go',
            })
            .instance(`host-${hostIdx}`)
        )
    );
  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      services.map((service) =>
        service.error({ message: 'error', type: 'My Type' }).timestamp(timestamp)
      )
    );
}
