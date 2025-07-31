/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, log } from '@kbn/apm-synthtrace-client';
import { LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';

export async function createSimpleSyntheticLogs({
  logsSynthtraceEsClient,
  message,
  dataset,
}: {
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
  message?: string;
  dataset?: string;
}) {
  const range = timerange('now-15m', 'now');

  const simpleLogs = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message(message ?? 'simple log message')
        .dataset(dataset ?? 'web.access')
        .timestamp(timestamp)
    );

  await logsSynthtraceEsClient.index([simpleLogs]);
}
