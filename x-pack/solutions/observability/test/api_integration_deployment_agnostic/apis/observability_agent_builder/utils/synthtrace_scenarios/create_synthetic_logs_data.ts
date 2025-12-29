/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, log } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

interface ServiceConfig {
  name: string;
  environment?: string;
}

export async function createSyntheticLogsData({
  getService,
  message = 'simple log message',
  dataset = 'web.access',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  message?: string;
  dataset?: string;
}): Promise<{ logsSynthtraceEsClient: LogsSynthtraceEsClient }> {
  const synthtrace = getService('synthtrace');
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

  const range = timerange('now-15m', 'now');

  const simpleLogs = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => log.create().message(message).dataset(dataset).timestamp(timestamp));

  await logsSynthtraceEsClient.index([simpleLogs]);

  return { logsSynthtraceEsClient };
}

export async function createSyntheticLogsWithService({
  getService,
  services,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  services: ServiceConfig[];
}): Promise<{ logsSynthtraceEsClient: LogsSynthtraceEsClient }> {
  const synthtrace = getService('synthtrace');
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

  const range = timerange('now-15m', 'now');

  const logGenerators = services.map((serviceConfig) =>
    range
      .interval('1m')
      .rate(5)
      .generator((timestamp) =>
        log
          .create()
          .message(`Log message from ${serviceConfig.name}`)
          .logLevel('info')
          .service(serviceConfig.name)
          .defaults({
            'service.name': serviceConfig.name,
            ...(serviceConfig.environment && {
              'service.environment': serviceConfig.environment,
            }),
          })
          .timestamp(timestamp)
      )
  );

  await logsSynthtraceEsClient.index(logGenerators);

  return { logsSynthtraceEsClient };
}
