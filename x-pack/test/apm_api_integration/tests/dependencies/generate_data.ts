/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const dataConfig = {
  rate: 20,
  transaction: {
    name: 'GET /api/product/list',
    duration: 1000,
  },
  span: {
    name: 'GET apm-*/_search',
    type: 'db',
    subType: 'elasticsearch',
    destination: 'elasticsearch',
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
  const instance = apm
    .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
    .instance('instance-a');
  const { rate, transaction, span } = dataConfig;

  await synthtraceEsClient.index(
    timerange(start, end)
      .interval('1m')
      .rate(rate)
      .generator((timestamp) =>
        instance
          .transaction({ transactionName: transaction.name })
          .timestamp(timestamp)
          .duration(transaction.duration)
          .success()
          .children(
            instance
              .span({ spanName: span.name, spanType: span.type, spanSubtype: span.subType })
              .duration(transaction.duration)
              .success()
              .destination(span.destination)
              .timestamp(timestamp)
          )
      )
  );
}
