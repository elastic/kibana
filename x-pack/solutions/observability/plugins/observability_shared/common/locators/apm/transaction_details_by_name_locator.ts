/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import {
  TRANSACTION_DETAILS_BY_NAME_LOCATOR,
  TransactionDetailsByNameParams,
} from '@kbn/deeplinks-observability';

export type TransactionDetailsByNameLocator = LocatorPublic<TransactionDetailsByNameParams>;

export class TransactionDetailsByNameLocatorDefinition
  implements LocatorDefinition<TransactionDetailsByNameParams>
{
  public readonly id = TRANSACTION_DETAILS_BY_NAME_LOCATOR;

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    serviceName,
    transactionName,
  }: TransactionDetailsByNameParams) => {
    const params = { rangeFrom, rangeTo, serviceName, transactionName };
    return {
      app: 'apm',
      path: `/link-to/transaction?${qs.stringify(params)}`,
      state: {},
    };
  };
}
