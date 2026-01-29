/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { log, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export interface LogData {
  traceId: string;
  serviceName: string;
  errorMessage: string;
  warningMessage: string;
  infoMessage: string;
}

export interface LogsResult {
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
  logData: LogData;
}

const SERVICE_NAME = 'payment-service';
const ERROR_MESSAGE = 'Failed to process payment: Connection timeout';
const WARNING_MESSAGE = 'High latency detected in payment processing';
const INFO_MESSAGE = 'Payment request received';

export const createLogsWithErrors = async ({
  getService,
  environment = 'production',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  environment?: string;
}): Promise<LogsResult> => {
  const synthtrace = getService('synthtrace');
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

  await logsSynthtraceEsClient.clean();

  const traceId = 'test-trace-id';
  const start = moment().subtract(15, 'minutes').valueOf();
  const end = moment().subtract(14, 'minutes').valueOf();
  const range = timerange(start, end);

  const getLogLevelAndMessage = (index: number) => {
    if (index === 0) return { logLevel: 'error' as const, message: ERROR_MESSAGE };
    if (index === 1) return { logLevel: 'warn' as const, message: WARNING_MESSAGE };
    return { logLevel: 'info' as const, message: INFO_MESSAGE };
  };

  const logs = range
    .interval('10s')
    .rate(1)
    .generator((timestamp, index) => {
      const { logLevel, message } = getLogLevelAndMessage(index);
      return log
        .create()
        .message(message)
        .logLevel(logLevel)
        .service(SERVICE_NAME)
        .defaults({
          'service.environment': environment,
          'trace.id': traceId,
          'host.name': 'payment-host-1',
          'container.id': 'container-123',
        })
        .timestamp(timestamp);
    });

  await logsSynthtraceEsClient.index([logs]);
  await logsSynthtraceEsClient.refresh();

  return {
    logsSynthtraceEsClient,
    logData: {
      traceId,
      serviceName: SERVICE_NAME,
      errorMessage: ERROR_MESSAGE,
      warningMessage: WARNING_MESSAGE,
      infoMessage: INFO_MESSAGE,
    },
  };
};
