/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const config = {
  appleTransaction: {
    name: 'GET /apple',
  },
  bananaTransaction: {
    name: 'GET /banana',
  },
};

export async function generateData({
  synthtraceEsClient,
  serviceName,
  start,
  end,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  serviceName: string;
  start: number;
  end: number;
}) {
  const serviceInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const interval = '1m';

  const { bananaTransaction, appleTransaction } = config;

  const documents = [
    timerange(start, end)
      .interval(interval)
      .generator((timestamp) =>
        serviceInstance
          .transaction({ transactionName: appleTransaction.name })
          .timestamp(timestamp)
          .duration(10)
      ),
    timerange(start, end)
      .interval(interval)
      .generator((timestamp) =>
        serviceInstance
          .transaction({ transactionName: bananaTransaction.name })
          .timestamp(timestamp)
          .duration(5)
      ),
  ];

  await synthtraceEsClient.index(documents);
}
