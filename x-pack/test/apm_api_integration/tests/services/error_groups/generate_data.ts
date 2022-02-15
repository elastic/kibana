/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import type { ApmSynthtraceEsClient } from '@elastic/apm-synthtrace';

export const config = {
  PROD_LIST_RATE: 75,
  PROD_LIST_ERROR_RATE: 25,
  PROD_ID_RATE: 50,
  PROD_ID_ERROR_RATE: 50,
  ERROR_NAME_1: 'Error test 1',
  ERROR_NAME_2: 'Error test 2',
};

export async function generateData({
  synthtraceEsClient,
  serviceName,
  start,
  end,
}: {
  synthtraceEsClient: ApmSynthtraceEsClient;
  serviceName: string;
  start: number;
  end: number;
}) {
  const serviceGoProdInstance = apm.service(serviceName, 'production', 'go').instance('instance-a');

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

  await synthtraceEsClient.index([
    timerange(start, end)
      .interval('1m')
      .rate(PROD_LIST_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductList)
          .timestamp(timestamp)
          .duration(1000)
          .success()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(PROD_LIST_ERROR_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductList)
          .errors(serviceGoProdInstance.error(ERROR_NAME_1, 'foo').timestamp(timestamp))
          .duration(1000)
          .timestamp(timestamp)
          .failure()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(PROD_ID_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductId)
          .timestamp(timestamp)
          .duration(1000)
          .success()
      ),
    timerange(start, end)
      .interval('1m')
      .rate(PROD_ID_ERROR_RATE)
      .generator((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductId)
          .errors(serviceGoProdInstance.error(ERROR_NAME_2, 'bar').timestamp(timestamp))
          .duration(1000)
          .timestamp(timestamp)
          .failure()
      ),
  ]);
}
