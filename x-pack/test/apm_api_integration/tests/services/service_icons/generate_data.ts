/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@elastic/apm-synthtrace';

export const dataConfig = {
  rate: 10,
  serviceName: 'synth-node',
  agentName: 'node',
  cloud: {
    provider: 'aws',
    serviceName: 'lambda',
  },
};

export async function generateData({
  synthtraceEsClient,
  start,
  end,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const { serviceName, agentName, rate, cloud } = dataConfig;
  const { provider, serviceName: cloudServiceName } = cloud;

  const instance = apm.service(serviceName, 'production', agentName).instance('instance-a');

  const metricsets = timerange(start, end)
    .interval('30s')
    .rate(rate)
    .flatMap((timestamp) =>
      instance
        .appMetrics({})
        .timestamp(timestamp)
        .defaults({
          'kubernetes.pod.uid': 'test',
          'cloud.provider': provider,
          'cloud.service.name': cloudServiceName,
        })
        .serialize()
    );

  await synthtraceEsClient.index(metricsets);
}
