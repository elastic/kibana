/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const dataConfig = {
  serviceName: 'synth-go',
  coldStartTransaction: {
    name: 'GET /apple 🍎',
    duration: 1000,
  },
  warmStartTransaction: {
    name: 'GET /banana 🍌',
    duration: 2000,
  },
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
  const { coldStartTransaction, warmStartTransaction, serviceName } = dataConfig;
  const instance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const traceEvents = [
    timerange(start, end)
      .interval('1m')
      .rate(coldStartRate)
      .generator((timestamp) =>
        instance
          .transaction({ transactionName: coldStartTransaction.name })
          .defaults({
            'faas.coldstart': true,
          })
          .timestamp(timestamp)
          .duration(coldStartTransaction.duration)
          .success()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(warmStartRate)
      .generator((timestamp) =>
        instance
          .transaction({ transactionName: warmStartTransaction.name })
          .defaults({
            'faas.coldstart': false,
          })
          .timestamp(timestamp)
          .duration(warmStartTransaction.duration)
          .success()
      ),
  ];

  await synthtraceEsClient.index(traceEvents);
}
