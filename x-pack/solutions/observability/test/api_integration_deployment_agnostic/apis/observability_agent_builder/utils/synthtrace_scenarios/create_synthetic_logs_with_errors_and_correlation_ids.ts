/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Timerange } from '@kbn/synthtrace-client';
import { timerange, log } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export async function createSyntheticLogsWithErrorsAndCorrelationIds({
  getService,
  logs,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  logs: Array<{ level: string; message: string; [key: string]: unknown }>;
}): Promise<{ logsSynthtraceEsClient: LogsSynthtraceEsClient }> {
  const synthtrace = getService('synthtrace');
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
  await logsSynthtraceEsClient.clean();
  const range = timerange('now-5m', 'now');

  const synthLogs = range
    .interval('5m')
    .rate(1)
    .generator((timestamp) => {
      const baseTime = timestamp;

      return logs.map((event, index) => {
        const { level, message, '@timestamp': eventTimestamp, ...logAttributes } = event;
        return (
          log
            .create()
            .message(message)
            .logLevel(level.toUpperCase())
            .defaults(logAttributes)
            // @ts-expect-error
            .timestamp(eventTimestamp ?? baseTime + index * 10000)
        );
      });
    });

  const logsWithoutCorrelationId = getLogsWithoutCorrelationId({ range });
  await logsSynthtraceEsClient.index([synthLogs, logsWithoutCorrelationId]);

  return { logsSynthtraceEsClient };
}

// generate some background noise logs without correlation ids
function getLogsWithoutCorrelationId({ range }: { range: Timerange }) {
  const logEvents = [
    { level: 'info', message: 'Background task running' },
    { level: 'error', message: 'Background error without correlation' },
    { level: 'warn', message: 'Background warning' },
    { level: 'debug', message: 'Background debug log' },
  ];

  return range
    .interval('5m')
    .rate(1)
    .generator((timestamp) => {
      const baseTime = timestamp;

      return logEvents.map((event, index) => {
        return log
          .create()
          .message(event.message)
          .logLevel(event.level.toUpperCase())
          .defaults({
            'service.name': 'background-noise-service',
            'host.name': 'background-host',
          })
          .timestamp(baseTime + index * 10000);
      });
    });
}
