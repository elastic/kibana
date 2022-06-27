/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@elastic/apm-synthtrace';

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
  const instance = apm.service('synth-go', 'production', 'go').instance('instance-a');
  const { rate, transaction, span } = dataConfig;

  await synthtraceEsClient.index(
    timerange(start, end)
      .interval('1m')
      .rate(rate)
      .generator((timestamp) =>
        instance
          .transaction(transaction.name)
          .timestamp(timestamp)
          .duration(transaction.duration)
          .success()
          .children(
            instance
              .span(span.name, span.type, span.subType)
              .duration(transaction.duration)
              .success()
              .destination(span.destination)
              .timestamp(timestamp)
          )
      )
  );
}
