/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ApmSynthtraceEsClient, LogsSynthtraceEsClient } from '@kbn/synthtrace';
import { apm, httpExitSpan, log, timerange } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../../ftr_provider_context';

export interface DistributedTraceData {
  traceId: string;
  errorId: string;
  errorMessage: string;
  errorType: string;
  serviceName: string;
  services: string[];
  logMessages: string[];
}

export interface DistributedTraceResult {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  logsSynthtraceEsClient: LogsSynthtraceEsClient;
  traceData: DistributedTraceData;
}

const ERROR_SERVICE_NAME = 'payment-service';

export const createDistributedTraceWithErrors = async ({
  getService,
  environment = 'production',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  environment?: string;
}): Promise<DistributedTraceResult> => {
  const es = getService('es');
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
  const logsSynthtraceEsClient = synthtrace.createLogsSynthtraceEsClient();

  await apmSynthtraceEsClient.clean();
  await logsSynthtraceEsClient.clean();

  const apiGateway = apm
    .service({ name: 'api-gateway', environment, agentName: 'nodejs' })
    .instance('api-gateway-1');
  const orderService = apm
    .service({ name: 'order-service', environment, agentName: 'java' })
    .instance('order-service-1');
  const paymentService = apm
    .service({ name: ERROR_SERVICE_NAME, environment, agentName: 'python' })
    .instance(`${ERROR_SERVICE_NAME}-1`);
  const inventoryService = apm
    .service({ name: 'inventory-service', environment, agentName: 'go' })
    .instance('inventory-service-1');

  const errorMessage = 'Payment gateway timeout: Connection to stripe.com timed out after 30000ms';
  const errorType = 'PaymentTimeoutException';

  const timestamp = moment().subtract(5, 'minutes').valueOf();

  const distributedTrace = apiGateway
    .transaction({ transactionName: 'POST /api/orders' })
    .timestamp(timestamp)
    .duration(500)
    .failure()
    .children(
      // api-gateway -> order-service
      apiGateway
        .span(
          httpExitSpan({
            spanName: 'POST /orders',
            destinationUrl: 'http://order-service:3000',
          })
        )
        .duration(450)
        .timestamp(timestamp + 10)
        .children(
          orderService
            .transaction({ transactionName: 'ProcessOrder' })
            .timestamp(timestamp + 20)
            .duration(400)
            .failure()
            .children(
              // order-service -> inventory-service
              orderService
                .span(
                  httpExitSpan({
                    spanName: 'GET /inventory',
                    destinationUrl: 'http://inventory-service:3000',
                  })
                )
                .duration(50)
                .timestamp(timestamp + 30)
                .children(
                  inventoryService
                    .transaction({ transactionName: 'CheckInventory' })
                    .timestamp(timestamp + 40)
                    .duration(30)
                    .success()
                ),
              // order-service -> payment-service
              orderService
                .span(
                  httpExitSpan({
                    spanName: 'POST /payments',
                    destinationUrl: 'http://payment-service:3000',
                  })
                )
                .duration(200)
                .timestamp(timestamp + 100)
                .children(
                  paymentService
                    .transaction({ transactionName: 'ProcessPayment' })
                    .timestamp(timestamp + 110)
                    .duration(180)
                    .failure()
                    .children(
                      // payment-service -> postgresql
                      paymentService
                        .span({
                          spanName: 'SELECT from payments',
                          spanType: 'db',
                          spanSubtype: 'postgresql',
                        })
                        .destination('postgresql')
                        .timestamp(timestamp + 120)
                        .duration(50)
                        .success(),
                      // payment-service -> stripe.com (fails)
                      paymentService
                        .span({
                          spanName: 'POST stripe.com/charges',
                          spanType: 'external',
                          spanSubtype: 'http',
                        })
                        .destination('stripe.com')
                        .timestamp(timestamp + 180)
                        .duration(100)
                        .failure()
                    )
                    .errors(
                      paymentService
                        .error({
                          message: errorMessage,
                          type: errorType,
                          culprit: 'PaymentGatewayClient.processCharge',
                        })
                        .timestamp(timestamp + 280)
                    )
                )
            )
        )
    );

  await apmSynthtraceEsClient.index(
    timerange(moment().subtract(10, 'minutes'), moment())
      .interval('10m')
      .rate(1)
      .generator(() => distributedTrace)
  );

  // Refresh the data streams to ensure data is searchable
  await es.indices.refresh({ index: 'logs-apm*,traces-apm*' });

  // Query ES to get the actual error ID and trace ID
  const errorResponse = await es.search({
    index: 'logs-apm.error*',
    query: {
      bool: {
        filter: [
          { term: { 'service.name': ERROR_SERVICE_NAME } },
          { match_phrase: { 'error.exception.message': errorMessage } },
        ],
      },
    },
    size: 1,
    fields: ['error.id', 'trace.id'],
  });

  const errorHit = errorResponse.hits.hits[0];
  if (!errorHit) {
    throw new Error(
      `No error document found for service '${ERROR_SERVICE_NAME}' with message '${errorMessage}'`
    );
  }

  const actualErrorId = errorHit.fields?.['error.id']?.[0] || errorHit._id;
  const actualTraceId = errorHit.fields?.['trace.id']?.[0];

  if (!actualErrorId) {
    throw new Error('Could not determine error ID from indexed document');
  }

  if (!actualTraceId) {
    throw new Error('Could not determine trace ID from indexed document');
  }

  // Generate logs linked to the same trace
  const logMessages = [
    `[payment-service] Processing payment request for order`,
    `[payment-service] Connecting to payment gateway stripe.com`,
    `[payment-service] ERROR: Connection timeout after 30000ms`,
  ];

  await logsSynthtraceEsClient.index(
    timerange(moment().subtract(10, 'minutes'), moment())
      .interval('1m')
      .rate(1)
      .generator((logTimestamp) =>
        logMessages.map((message, idx) =>
          log
            .create()
            .message(message)
            .logLevel(idx === 2 ? 'error' : 'info')
            .service(ERROR_SERVICE_NAME)
            .defaults({
              'trace.id': actualTraceId,
            })
            .timestamp(logTimestamp)
        )
      )
  );

  // Refresh logs index
  await es.indices.refresh({ index: 'logs-*' });

  return {
    apmSynthtraceEsClient,
    logsSynthtraceEsClient,
    traceData: {
      traceId: actualTraceId,
      errorId: actualErrorId,
      errorMessage,
      errorType,
      serviceName: ERROR_SERVICE_NAME,
      services: ['api-gateway', 'order-service', ERROR_SERVICE_NAME, 'inventory-service'],
      logMessages,
    },
  };
};
