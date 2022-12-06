/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const config = {
  firstTransaction: {
    name: 'GET /apple 🍎',
    successRate: 75,
    failureRate: 25,
  },
  secondTransaction: {
    name: 'GET /banana 🍌',
    successRate: 50,
    failureRate: 50,
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
  const serviceGoProdInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const interval = '1m';

  const { firstTransaction, secondTransaction } = config;

  const documents = [firstTransaction, secondTransaction].map((transaction, index) => {
    return timerange(start, end)
      .interval(interval)
      .rate(transaction.successRate)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName: transaction.name })
          .timestamp(timestamp)
          .duration(1000)
          .success()
      )
      .merge(
        timerange(start, end)
          .interval(interval)
          .rate(transaction.failureRate)
          .generator((timestamp) =>
            serviceGoProdInstance
              .transaction({ transactionName: transaction.name })
              .errors(
                serviceGoProdInstance
                  .error({ message: `Error 1 transaction ${transaction.name}` })
                  .timestamp(timestamp),
                serviceGoProdInstance
                  .error({ message: `Error 2 transaction ${transaction.name}` })
                  .timestamp(timestamp)
              )
              .duration(1000)
              .timestamp(timestamp)
              .failure()
          )
      );
  });

  await synthtraceEsClient.index(documents);
}
