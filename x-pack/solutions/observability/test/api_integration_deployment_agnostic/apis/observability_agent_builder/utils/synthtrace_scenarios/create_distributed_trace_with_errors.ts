/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmFields } from '@kbn/synthtrace-client';
import type { Serializable } from '@kbn/synthtrace-client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export interface DistributedTraceData {
  traceId: string;
  errorId: string;
  errorGroupingKey: string;
  services: string[];
}

/**
 * Creates a distributed trace spanning multiple services with errors.
 * The trace flow:
 *   api-gateway -> order-service -> payment-service (error here)
 *                                -> inventory-service
 */
export const createDistributedTraceWithErrors = async ({
  getService,
  environment = 'production',
}: {
  getService: DeploymentAgnosticFtrProviderContext['getService'];
  environment?: string;
}): Promise<{
  apmSynthtraceEsClient: Awaited<
    ReturnType<
      Awaited<
        ReturnType<DeploymentAgnosticFtrProviderContext['getService']>
      >['createApmSynthtraceEsClient']
    >
  >;
  traceData: DistributedTraceData;
}> => {
  const synthtrace = getService('synthtrace');
  const apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

  await apmSynthtraceEsClient.clean();

  // Service definitions
  const services = {
    apiGateway: apm
      .service({ name: 'api-gateway', environment, agentName: 'nodejs' })
      .instance('api-gateway-1'),
    orderService: apm
      .service({ name: 'order-service', environment, agentName: 'java' })
      .instance('order-service-1'),
    paymentService: apm
      .service({ name: 'payment-service', environment, agentName: 'python' })
      .instance('payment-service-1'),
    inventoryService: apm
      .service({ name: 'inventory-service', environment, agentName: 'go' })
      .instance('inventory-service-1'),
  };

  // Fixed trace ID for testing
  const traceId = 'test-distributed-trace-001';
  const errorId = 'test-error-001';
  const errorGroupingKey = 'payment-timeout-error-group';

  const timestamp = moment().subtract(5, 'minutes').valueOf();

  const documents: Array<Serializable<ApmFields>> = [];

  // Root transaction: api-gateway
  const rootTransaction = services.apiGateway
    .transaction({ transactionName: 'POST /api/orders' })
    .timestamp(timestamp)
    .duration(500)
    .failure()
    .defaults({ 'trace.id': traceId });

  // Order service transaction (child of api-gateway)
  const orderTransaction = services.orderService
    .transaction({ transactionName: 'ProcessOrder' })
    .timestamp(timestamp + 10)
    .duration(400)
    .failure()
    .defaults({ 'trace.id': traceId });

  // Payment service transaction with error (child of order-service)
  const paymentTransaction = services.paymentService
    .transaction({ transactionName: 'ProcessPayment' })
    .timestamp(timestamp + 50)
    .duration(200)
    .failure()
    .defaults({ 'trace.id': traceId });

  // Inventory service transaction (child of order-service, succeeds)
  const inventoryTransaction = services.inventoryService
    .transaction({ transactionName: 'CheckInventory' })
    .timestamp(timestamp + 100)
    .duration(50)
    .success()
    .defaults({ 'trace.id': traceId });

  // Database span from payment service
  const dbSpan = services.paymentService
    .span({
      spanName: 'SELECT from payments',
      spanType: 'db',
      spanSubtype: 'postgresql',
    })
    .destination('postgresql')
    .timestamp(timestamp + 60)
    .duration(100)
    .failure()
    .defaults({ 'trace.id': traceId });

  // External call span from payment service
  const externalSpan = services.paymentService
    .span({
      spanName: 'POST stripe.com/charges',
      spanType: 'external',
      spanSubtype: 'http',
    })
    .destination('stripe.com')
    .timestamp(timestamp + 70)
    .duration(150)
    .failure()
    .defaults({ 'trace.id': traceId });

  // Error in payment service
  const paymentError = services.paymentService
    .error({
      message: 'Payment gateway timeout: Connection to stripe.com timed out after 30000ms',
      type: 'PaymentTimeoutException',
    })
    .timestamp(timestamp + 80)
    .defaults({
      'trace.id': traceId,
      'error.id': errorId,
      'error.grouping_key': errorGroupingKey,
      'error.culprit': 'PaymentGatewayClient.processCharge',
    });

  documents.push(rootTransaction);
  documents.push(orderTransaction);
  documents.push(paymentTransaction);
  documents.push(inventoryTransaction);
  documents.push(dbSpan);
  documents.push(externalSpan);
  documents.push(paymentError);

  // Add more spans to create a "long" trace
  for (let i = 0; i < 20; i++) {
    documents.push(
      services.orderService
        .span({
          spanName: `ValidateOrderItem-${i}`,
          spanType: 'app',
          spanSubtype: 'internal',
        })
        .timestamp(timestamp + 15 + i * 5)
        .duration(10)
        .success()
        .defaults({ 'trace.id': traceId })
    );
  }

  await apmSynthtraceEsClient.index(
    timerange(moment().subtract(10, 'minutes'), moment())
      .interval('10m')
      .rate(1)
      .generator(() => documents)
  );

  return {
    apmSynthtraceEsClient,
    traceData: {
      traceId,
      errorId,
      errorGroupingKey,
      services: ['api-gateway', 'order-service', 'payment-service', 'inventory-service'],
    },
  };
};
