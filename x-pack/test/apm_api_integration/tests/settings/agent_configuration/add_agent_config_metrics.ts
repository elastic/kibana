/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { timerange, agentConfig } from '@elastic/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@elastic/apm-synthtrace';

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
  const agentConfigMetrics = agentConfig(etag ?? 'test-etag').metrics();

  const agentConfigEvents = [
    timerange(start, end)
      .interval('1m')
      .rate(1)
      .generator((timestamp) => agentConfigMetrics.timestamp(timestamp)),
  ];

  await synthtraceEsClient.index(agentConfigEvents);
}
