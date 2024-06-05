/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export const config = {
  PROD_LIST_RATE: 75,
  PROD_LIST_ERROR_RATE: 25,
  PROD_ID_RATE: 50,
  PROD_ID_ERROR_RATE: 50,
  ERROR_NAME_1: 'Error test 1',
  ERROR_NAME_2: 'Error test 2',
};

export async function generateData({
  apmSynthtraceEsClient,
  serviceName,
  start,
  end,
}: {
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
  serviceName: string;
  start: number;
  end: number;
}) {
  const serviceGoProdInstance = apm
    .service({ name: serviceName, environment: 'production', agentName: 'go' })
    .instance('instance-a');

  const transactionNameProductList = 'GET /api/product/list';
  const transactionNameProductId = 'GET /api/product/:id';

  const {
    PROD_LIST_RATE,
    PROD_LIST_ERROR_RATE,
    PROD_ID_RATE,
    PROD_ID_ERROR_RATE,
    ERROR_NAME_1,
    ERROR_NAME_2,
  } = config;

  await apmSynthtraceEsClient.index([
    timerange(start, end)
      .interval('1m')
      .rate(PROD_LIST_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName: transactionNameProductList })
          .timestamp(timestamp)
          .duration(1000)
          .success()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(PROD_LIST_ERROR_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName: transactionNameProductList })
          .errors(
            serviceGoProdInstance.error({ message: ERROR_NAME_1, type: 'foo' }).timestamp(timestamp)
          )
          .duration(1000)
          .timestamp(timestamp)
          .failure()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(PROD_ID_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName: transactionNameProductId })
          .timestamp(timestamp)
          .duration(1000)
          .success()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(PROD_ID_ERROR_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction({ transactionName: transactionNameProductId })
          .errors(
            serviceGoProdInstance.error({ message: ERROR_NAME_2, type: 'bar' }).timestamp(timestamp)
          )
          .duration(1000)
          .timestamp(timestamp)
          .failure()
      ),
  ]);
}
