/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@elastic/apm-synthtrace';

export const dataConfig = {
  serviceName: 'synth-go',
  transactionName: 'GET /apple 🍎',
  duration: 1000,
};

export async function generateData({
  synthtraceEsClient,
  start,
  end,
  coldStartRate,
  warmStartRate,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
  coldStartRate: number;
  warmStartRate: number;
}) {
  const { transactionName, duration, serviceName } = dataConfig;
  const instance = apm.service(serviceName, 'production', 'go').instance('instance-a');

  const traceEvents = timerange(start, end)
    .interval('1m')
    .rate(coldStartRate)
    .spans((timestamp) =>
      instance
        .transaction(transactionName)
        .defaults({
          'faas.coldstart': true,
        })
        .timestamp(timestamp)
        .duration(duration)
        .success()
        .serialize()
    )
    .concat(
      timerange(start, end)
        .interval('1m')
        .rate(warmStartRate)
        .spans((timestamp) =>
          instance
            .transaction(transactionName)
            .defaults({
              'faas.coldstart': false,
            })
            .timestamp(timestamp)
            .duration(duration)
            .success()
            .serialize()
        )
    );

  await synthtraceEsClient.index(traceEvents);
}
