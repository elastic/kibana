/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';

export const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

const getApmLocatorParams = (params: SerializableRecord) => {
  return {
    serviceName: params.serviceName,
    serviceOverviewTab: params.serviceOverviewTab,
    query: {
      environment: params.environment,
      transactionType: params.transactionType,
      transactionName: params.transactionName,
      rangeFrom: params.rangeFrom,
      rangeTo: params.rangeTo,
    },
  };
};

export const getApmAppLocator = (baseLocator?: LocatorPublic<SerializableRecord>) => {
  if (!baseLocator) return;

  return {
    ...baseLocator,
    getRedirectUrl: (params: SerializableRecord) =>
      baseLocator.getRedirectUrl(getApmLocatorParams(params)),
    navigate: (params: SerializableRecord) => baseLocator.navigate(getApmLocatorParams(params)),
  };
};
