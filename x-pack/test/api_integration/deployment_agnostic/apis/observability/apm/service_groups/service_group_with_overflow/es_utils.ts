/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function createServiceTransactionMetricsDocs({
  time,
  service,
  agentName,
  overflowCount,
}: {
  time: number;
  service: {
    name: string;
    environment?: string;
    language?: string;
  };
  agentName?: string;
  overflowCount?: number;
}) {
  return {
    processor: {
      event: 'metric' as const,
    },
    '@timestamp': new Date(time).toISOString(),
    ...(agentName && {
      agent: {
        name: agentName,
      },
    }),
    event: {
      ingested: new Date(time).toISOString(),
    },
    metricset: {
      name: 'service_transaction',
    },
    service,
    ...(overflowCount && {
      service_transaction: {
        aggregation: {
          overflow_count: overflowCount,
        },
      },
    }),
    observer: {
      version: '8.9.0',
    },
  };
}
