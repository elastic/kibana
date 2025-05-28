/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { observer } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { Readable } from 'stream';

export function addAgentConfigEtagMetric({
  apmSynthtraceEsClient,
  timestamp,
  etag,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  timestamp: number;
  etag: string;
}) {
  const agentConfigMetric = observer().agentConfig().etag(etag).timestamp(timestamp);
  return apmSynthtraceEsClient.index(Readable.from([agentConfigMetric]));
}
