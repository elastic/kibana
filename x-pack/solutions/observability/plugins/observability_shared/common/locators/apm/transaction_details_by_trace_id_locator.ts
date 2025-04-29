/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR,
  type TransactionDetailsByTraceIdLocatorParams,
} from '@kbn/deeplinks-observability';

export { TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR, type TransactionDetailsByTraceIdLocatorParams };

export type TransactionDetailsByTraceIdLocator =
  LocatorPublic<TransactionDetailsByTraceIdLocatorParams>;

export class TransactionDetailsByTraceIdLocatorDefinition
  implements LocatorDefinition<TransactionDetailsByTraceIdLocatorParams>
{
  public readonly id = TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    waterfallItemId,
    traceId,
  }: TransactionDetailsByTraceIdLocatorParams) => {
    const params = { rangeFrom, rangeTo, waterfallItemId };
    return {
      app: 'apm',
      path: `/link-to/trace/${encodeURIComponent(traceId)}?${qs.stringify(params)}`,
      state: {},
    };
  };
}
