/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export async function generateData({
  apmSynthtraceEsClient,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const serviceRunsInContainerInstance = apm
    .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const serviceInstance = apm
    .service({ name: 'synth-java', environment: 'production', agentName: 'java' })
    .instance('instance-b');

  await apmSynthtraceEsClient.index(
    timerange(start, end)
      .interval('1m')
      .generator((timestamp) => {
        return [
          serviceRunsInContainerInstance
            .transaction({ transactionName: 'GET /apple 🍎' })
            .defaults({
              'container.id': 'foo',
              'host.hostname': 'bar',
              'kubernetes.pod.name': 'baz',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success(),
          serviceInstance
            .transaction({ transactionName: 'GET /banana 🍌' })
            .defaults({
              'host.hostname': 'bar',
            })
            .timestamp(timestamp)
            .duration(1000)
            .success(),
        ];
      })
  );
}
