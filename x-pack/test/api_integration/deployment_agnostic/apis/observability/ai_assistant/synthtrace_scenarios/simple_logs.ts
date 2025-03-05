/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, log } from '@kbn/apm-synthtrace-client';
import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export async function createSimpleSyntheticLogs({
  getService,
  message,
  dataset,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  message?: string;
  dataset?: string;
}) {
  const synthtrace = getService('synthtrace');
  const logSynthtraceEsClient = await synthtrace.createLogsSynthtraceEsClient();
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

  await logSynthtraceEsClient.index([simpleLogs]);
  return { logSynthtraceEsClient };
}
