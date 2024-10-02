/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

// Generate synthetic data for the environment test suite
export async function generateData({
  apmSynthtraceEsClient,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
}) {
  const environmentNames = ['production', 'development', 'staging'];
  const serviceNames = ['go', 'java', 'node'];

  const services = environmentNames.flatMap((environment) => {
    return serviceNames.flatMap((serviceName) => {
      return apm
        .service({
          name: serviceName,
          environment,
          agentName: serviceName,
        })
        .instance('instance-a');
    });
  });

  const goServiceWithAdditionalEnvironment = apm
    .service({
      name: 'go',
      environment: 'custom-go-environment',
      agentName: 'go',
    })
    .instance('instance-a');

  // Generate a transaction for each service
  const docs = timerange(start, end)
    .ratePerMinute(1)
    .generator((timestamp) => {
      const loopGeneratedDocs = services.flatMap((service) => {
        return service
          .transaction({ transactionName: 'GET /api/product/:id' })
          .timestamp(timestamp)
          .duration(1000);
      });

      const customDoc = goServiceWithAdditionalEnvironment
        .transaction({
          transactionName: 'GET /api/go/memory',
          transactionType: 'custom-go-type',
        })
        .timestamp(timestamp)
        .duration(1000);

      return [...loopGeneratedDocs, customDoc];
    });

  return apmSynthtraceEsClient.index(docs);
}
