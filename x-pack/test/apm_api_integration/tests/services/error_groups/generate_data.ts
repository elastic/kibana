/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-synthtrace';
import type { SynthtraceEsClient } from '../../../common/synthtrace_es_client';

export const config = {
  GO_PROD_LIST_RATE: 75,
  GO_PROD_LIST_ERROR_RATE: 25,
  GO_PROD_ID_RATE: 50,
  GO_PROD_ID_ERROR_RATE: 50,
  ERROR_NAME_1: 'Error test 1',
  ERROR_NAME_2: 'Error test 2',
};

export async function generateData({
  synthtraceEsClient,
  serviceName,
  start,
  end,
}: {
  synthtraceEsClient: SynthtraceEsClient;
  serviceName: string;
  start: number;
  end: number;
}) {
  const serviceGoProdInstance = service(serviceName, 'production', 'go').instance('instance-a');

  const transactionNameProductList = 'GET /api/product/list';
  const transactionNameProductId = 'GET /api/product/:id';

  const {
    GO_PROD_LIST_RATE,
    GO_PROD_LIST_ERROR_RATE,
    GO_PROD_ID_RATE,
    GO_PROD_ID_ERROR_RATE,
    ERROR_NAME_1,
    ERROR_NAME_2,
  } = config;

  await synthtraceEsClient.index([
    ...timerange(start, end)
      .interval('1m')
      .rate(GO_PROD_LIST_RATE)
      .flatMap((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductList)
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .serialize()
      ),
    ...timerange(start, end)
      .interval('1m')
      .rate(GO_PROD_LIST_ERROR_RATE)
      .flatMap((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductList)
          .errors(serviceGoProdInstance.error(ERROR_NAME_1, 'foo').timestamp(timestamp))
          .duration(1000)
          .timestamp(timestamp)
          .failure()
          .serialize()
      ),
    ...timerange(start, end)
      .interval('1m')
      .rate(GO_PROD_ID_RATE)
      .flatMap((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductId)
          .timestamp(timestamp)
          .duration(1000)
          .success()
          .serialize()
      ),
    ...timerange(start, end)
      .interval('1m')
      .rate(GO_PROD_ID_ERROR_RATE)
      .flatMap((timestamp) =>
        serviceGoProdInstance
          .transaction(transactionNameProductId)
          .errors(serviceGoProdInstance.error(ERROR_NAME_2, 'bar').timestamp(timestamp))
          .duration(1000)
          .timestamp(timestamp)
          .failure()
          .serialize()
      ),
  ]);
}
