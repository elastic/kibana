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
    successRate: 75,
    failureRate: 25,
  },
  bananaTransaction: {
    name: 'GET /banana',
    successRate: 50,
    failureRate: 50,
  },
};

export async function generateLatencyData({
  apmSynthtraceEsClient,
  serviceName,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
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

  await apmSynthtraceEsClient.index(documents);
}

export async function generateErrorData({
  apmSynthtraceEsClient,
  serviceName,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  serviceName: string;
  start: number;
  end: number;
}) {
  const serviceInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const interval = '1m';

  const { bananaTransaction, appleTransaction } = config;

  const documents = [appleTransaction, bananaTransaction].flatMap((transaction, index) => {
    return [
      timerange(start, end)
        .interval(interval)
        .rate(transaction.successRate)
        .generator((timestamp) =>
          serviceInstance
            .transaction({ transactionName: transaction.name })
            .timestamp(timestamp)
            .duration(10)
            .success()
        ),
      timerange(start, end)
        .interval(interval)
        .rate(transaction.failureRate)
        .generator((timestamp) =>
          serviceInstance
            .transaction({ transactionName: transaction.name })
            .errors(
              serviceInstance
                .error({ message: `Error ${index}`, type: transaction.name })
                .timestamp(timestamp)
            )
            .duration(10)
            .timestamp(timestamp)
            .failure()
        ),
    ];
  });

  await apmSynthtraceEsClient.index(documents);
}
