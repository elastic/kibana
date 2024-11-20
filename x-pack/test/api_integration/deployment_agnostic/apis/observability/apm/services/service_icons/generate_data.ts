/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const dataConfig = {
  serviceName: 'synth-node',
  rate: 10,
  transaction: {
    name: 'GET /apple 🍎',
    duration: 1000,
  },
  agentName: 'node',
  cloud: {
    provider: 'aws',
    serviceName: 'lambda',
  },
};

export async function generateData({
  apmSynthtraceEsClient,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const { serviceName, agentName, rate, cloud, transaction } = dataConfig;
  const { provider, serviceName: cloudServiceName } = cloud;

  const instance = apm
    .service({ name: serviceName, environment: 'production', agentName })
    .instance('instance-a');

  const traceEvents = timerange(start, end)
    .interval('30s')
    .rate(rate)
    .generator((timestamp) =>
      instance
        .transaction({ transactionName: transaction.name })
        .defaults({
          'kubernetes.pod.uid': 'test',
          'cloud.provider': provider,
          'cloud.service.name': cloudServiceName,
        })
        .timestamp(timestamp)
        .duration(transaction.duration)
        .success()
    );

  await apmSynthtraceEsClient.index(traceEvents);
}
