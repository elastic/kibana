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
    name: 'GET /apple 🍎 ',
    successRate: 75,
    failureRate: 25,
  },
  bananaTransaction: {
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
  const servicesSwiftProdInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'swift' })
    .instance('instance-a');

  const interval = '1m';

  const { bananaTransaction, appleTransaction } = config;

  const documents = [appleTransaction, bananaTransaction].flatMap((transaction, index) => {
    return [
      timerange(start, end)
        .interval(interval)
        .rate(transaction.successRate)
        .generator((timestamp) =>
          servicesSwiftProdInstance
            .transaction({ transactionName: transaction.name })
            .timestamp(timestamp)
            .duration(1000)
            .success()
        ),
      timerange(start, end)
        .interval(interval)
        .rate(transaction.failureRate)
        .generator((timestamp) =>
          servicesSwiftProdInstance
            .transaction({ transactionName: transaction.name })
            .errors(
              servicesSwiftProdInstance
                .crash({
                  message: `Error ${index}`,
                  type: transaction.name,
                })
                .timestamp(timestamp)
            )
            .duration(1000)
            .timestamp(timestamp)
            .failure()
        ),
    ];
  });

  await synthtraceEsClient.index(documents);
}
