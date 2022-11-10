/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace';
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
  const phpService = apm
    .service({
      name: `custom-php-service`,
      environment: `custom-php-environment`,
      agentName: 'php',
    })
    .instance('instance-a');

  const docs = timerange(start, end)
    .ratePerMinute(1)
    .generator((timestamp) => {
      return phpService
        .transaction({
          transactionName: 'GET /api/php/memory',
          transactionType: 'custom-php-type',
        })
        .timestamp(timestamp)
        .duration(1000);
    });

  return await synthtraceEsClient.index(docs);
}
