/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export async function generateData({
  synthtraceEsClient,
  start,
  end,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const synthServices = [
    apm
      .service({ name: 'synth-go', environment: 'testing', agentName: 'go' })
      .instance('instance-1'),
    apm
      .service({ name: 'synth-java', environment: 'testing', agentName: 'java' })
      .instance('instance-2'),
    apm
      .service({ name: 'opbeans-node', environment: 'testing', agentName: 'nodejs' })
      .instance('instance-3'),
  ];

  await synthtraceEsClient.index(
    synthServices.map((service) =>
      timerange(start, end)
        .interval('5m')
        .rate(1)
        .generator((timestamp) =>
          service
            .transaction({
              transactionName: 'GET /api/product/list',
              transactionType: 'request',
            })
            .duration(2000)
            .timestamp(timestamp)
            .children(
              service
                .span({
                  spanName: '/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .destination('elasticsearch')
                .duration(100)
                .success()
                .timestamp(timestamp),
              service
                .span({
                  spanName: '/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .destination('elasticsearch')
                .duration(300)
                .success()
                .timestamp(timestamp)
            )
            .errors(
              service.error({ message: 'error 1', type: 'foo' }).timestamp(timestamp),
              service.error({ message: 'error 2', type: 'foo' }).timestamp(timestamp),
              service.error({ message: 'error 3', type: 'bar' }).timestamp(timestamp)
            )
        )
    )
  );
}
