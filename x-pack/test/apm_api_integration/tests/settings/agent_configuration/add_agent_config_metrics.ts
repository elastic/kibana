/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { timerange, observer } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export async function addAgentConfigMetrics({
  synthtraceEsClient,
  start,
  end,
  etag,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  start: number;
  end: number;
  etag?: string;
}) {
  const agentConfigEvents = [
    timerange(start, end)
      .interval('1m')
      .rate(1)
      .generator((timestamp) =>
        observer()
          .agentConfig()
          .etag(etag ?? 'test-etag')
          .timestamp(timestamp)
      ),
  ];

  await synthtraceEsClient.index(agentConfigEvents);
}
