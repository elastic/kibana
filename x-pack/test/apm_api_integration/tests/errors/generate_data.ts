/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, SynthtraceEsClient, timerange } from '@elastic/apm-synthtrace';

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
  synthtraceEsClient: SynthtraceEsClient;
  serviceName: string;
  start: number;
  end: number;
}) {
  const serviceGoProdInstance = service(serviceName, 'production', 'go').instance('instance-a');

  const interval = '1m';

  const { bananaTransaction, appleTransaction } = config;

  const documents = [appleTransaction, bananaTransaction]
    .map((transaction, index) => {
      return [
        ...timerange(start, end)
          .interval(interval)
          .rate(transaction.successRate)
          .flatMap((timestamp) =>
            serviceGoProdInstance
              .transaction(transaction.name)
              .timestamp(timestamp)
              .duration(1000)
              .success()
              .serialize()
          ),
        ...timerange(start, end)
          .interval(interval)
          .rate(transaction.failureRate)
          .flatMap((timestamp) =>
            serviceGoProdInstance
              .transaction(transaction.name)
              .errors(
                serviceGoProdInstance.error(`Error ${index}`, transaction.name).timestamp(timestamp)
              )
              .duration(1000)
              .timestamp(timestamp)
              .failure()
              .serialize()
          ),
      ];
    })
    .flatMap((_) => _);

  await synthtraceEsClient.index(documents);
}
