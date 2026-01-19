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
  errorLogId: string;
  warningLogId: string;
  infoLogId: string;
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
  const baseTime = moment().subtract(15, 'minutes').valueOf();
  const range = timerange(baseTime, baseTime + 60000);

  const errorMessage = 'Failed to process payment: Connection timeout';
  const warningMessage = 'High latency detected in payment processing';
  const infoMessage = 'Payment request received';

  const logs = range
    .interval('10s')
    .rate(1)
    .generator((timestamp, index) => {
      if (index === 0) {
        return log
          .create()
          .message(errorMessage)
          .logLevel('error')
          .service(SERVICE_NAME)
          .defaults({
            'service.environment': environment,
            'trace.id': traceId,
            'host.name': 'payment-host-1',
            'container.id': 'container-123',
          })
          .timestamp(timestamp);
      } else if (index === 1) {
        return log
          .create()
          .message(warningMessage)
          .logLevel('warn')
          .service(SERVICE_NAME)
          .defaults({
            'service.environment': environment,
            'trace.id': traceId,
            'host.name': 'payment-host-1',
            'container.id': 'container-123',
          })
          .timestamp(timestamp);
      } else {
        return log
          .create()
          .message(infoMessage)
          .logLevel('info')
          .service(SERVICE_NAME)
          .defaults({
            'service.environment': environment,
            'trace.id': traceId,
            'host.name': 'payment-host-1',
            'container.id': 'container-123',
          })
          .timestamp(timestamp);
      }
    });

  await logsSynthtraceEsClient.index([logs]);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const es = getService('es');
  const searchResponse = await es.search({
    index: 'logs-*',
    query: {
      bool: {
        must: [{ term: { 'service.name': SERVICE_NAME } }, { term: { 'trace.id': traceId } }],
      },
    },
    size: 10,
  });

  const hits = searchResponse.hits.hits as Array<{ _id: string; _source: any }>;
  const errorLog = hits.find((h) => h._source['log.level'] === 'error');
  const warningLog = hits.find((h) => h._source['log.level'] === 'warn');
  const infoLog = hits.find((h) => h._source['log.level'] === 'info');

  return {
    logsSynthtraceEsClient,
    logData: {
      errorLogId: errorLog?._id || '',
      warningLogId: warningLog?._id || '',
      infoLogId: infoLog?._id || '',
      traceId,
      serviceName: SERVICE_NAME,
      errorMessage,
      warningMessage,
      infoMessage,
    },
  };
};
