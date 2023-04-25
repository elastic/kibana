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
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
}) {
  const opbeansJava = apm
    .service({ name: 'opbeans-java', environment: 'production', agentName: 'java' })
    .instance('instance');
  const opbeansNode = apm
    .service({ name: 'opbeans-node', environment: 'production', agentName: 'node' })
    .instance('instance');
  const events = timerange('now-15m', 'now')
    .ratePerMinute(1)
    .generator((timestamp) => {
      return [
        opbeansJava
          .transaction({ transactionName: 'tx-java' })
          .timestamp(timestamp)
          .duration(50)
          .failure()
          .errors(
            opbeansJava
              .error({ message: '[ResponseError] index_not_found_exception' })
              .timestamp(timestamp + 50)
          ),
        opbeansNode
          .transaction({ transactionName: 'tx-node' })
          .timestamp(timestamp)
          .duration(100)
          .success(),
        opbeansNode
          .transaction({ transactionName: 'tx-node-2' })
          .timestamp(timestamp)
          .duration(200)
          .success(),
      ];
    });
  await synthtraceEsClient.index(events);
}
