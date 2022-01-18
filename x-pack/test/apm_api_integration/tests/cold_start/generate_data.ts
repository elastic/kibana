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
  rate: 10,
  transaction: {
    name: 'GET /apple 🍎',
    duration: 1000,
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
  const { rate, transaction, serviceName } = dataConfig;
  const instance = apm.service(serviceName, 'production', 'go').instance('instance-a');

  const traceEvents = timerange(start, end)
    .interval('1m')
    .rate(rate)
    .flatMap((timestamp) => [
      ...instance
        .transaction(transaction.name)
        .defaults({
          'faas.coldstart': 'true',
        })
        .timestamp(timestamp)
        .duration(transaction.duration)
        .success()
        .serialize(),
      ...instance
        .transaction(transaction.name)
        .defaults({
          'faas.coldstart': 'false',
        })
        .timestamp(timestamp)
        .duration(transaction.duration)
        .success()
        .serialize(),
    ]);

  await synthtraceEsClient.index(apm.getTransactionMetrics(traceEvents));
}
