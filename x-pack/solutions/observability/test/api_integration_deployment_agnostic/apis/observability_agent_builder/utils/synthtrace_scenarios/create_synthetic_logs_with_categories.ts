/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timerange, log } from '@kbn/synthtrace-client';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export async function createSyntheticLogsWithCategories({
  getService,
  serviceName,
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  serviceName: string;
}): Promise<{ logsSynthtraceEsClient: LogsSynthtraceEsClient }> {
  const synthtrace = getService('synthtrace');
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();
  await logsSynthtraceEsClient.clean();

  const range = timerange('now-15m', 'now');

  // Create multiple log patterns for categorization
  const paymentProcessingLogs = range
    .interval('30s')
    .rate(5)
    .generator((timestamp, index) =>
      log
        .create()
        .message(`Processing payment transaction for order #${10000 + index}`)
        .logLevel('info')
        .service(serviceName)
        .defaults({
          'service.name': serviceName,
          'log.level': 'info',
        })
        .timestamp(timestamp)
    );

  const paymentCompleteLogs = range
    .interval('30s')
    .rate(5)
    .generator((timestamp) =>
      log
        .create()
        .message('Payment transaction completed successfully')
        .logLevel('info')
        .service(serviceName)
        .defaults({
          'service.name': serviceName,
          'log.level': 'info',
        })
        .timestamp(timestamp)
    );

  const errorLogs = range
    .interval('2m')
    .rate(2)
    .generator((timestamp) =>
      log
        .create()
        .message('Payment processing failed: connection timeout')
        .logLevel('error')
        .service(serviceName)
        .defaults({
          'service.name': serviceName,
          'log.level': 'error',
        })
        .timestamp(timestamp)
    );

  const warningLogs = range
    .interval('1m')
    .rate(3)
    .generator((timestamp) =>
      log
        .create()
        .message('Payment gateway response time exceeded threshold')
        .logLevel('warn')
        .service(serviceName)
        .defaults({
          'service.name': serviceName,
          'log.level': 'warn',
        })
        .timestamp(timestamp)
    );

  const debugLogs = range
    .interval('15s')
    .rate(10)
    .generator((timestamp, index) =>
      log
        .create()
        .message(
          `Debug: Payment API called with request_id=${Math.random().toString(36).substring(2, 8)}`
        )
        .logLevel('debug')
        .service(serviceName)
        .defaults({
          'service.name': serviceName,
          'log.level': 'debug',
        })
        .timestamp(timestamp)
    );

  await logsSynthtraceEsClient.index([
    paymentProcessingLogs,
    paymentCompleteLogs,
    errorLogs,
    warningLogs,
    debugLogs,
  ]);

  return { logsSynthtraceEsClient };
}
