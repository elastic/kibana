/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  SLOWithSummaryResponse,
} from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';

type ApmIndicator = APMTransactionDurationIndicator | APMTransactionErrorRateIndicator;

export interface ResolvedApmParams {
  serviceName: string;
  environment: string;
  transactionType: string;
  transactionName: string;
}

export const APM_SOURCE_FIELDS = {
  SERVICE_NAME: 'service.name',
  SERVICE_ENVIRONMENT: 'service.environment',
  TRANSACTION_TYPE: 'transaction.type',
  TRANSACTION_NAME: 'transaction.name',
} as const;

export type ApmSourceField = (typeof APM_SOURCE_FIELDS)[keyof typeof APM_SOURCE_FIELDS];

interface ApmLocator {
  getRedirectUrl(params: Record<string, unknown>): string;
}

export const getResolvedApmParams = (slo: SLOWithSummaryResponse): ResolvedApmParams => {
  const { params } = slo.indicator as ApmIndicator;

  return {
    serviceName: (slo.groupings?.['service.name'] as string | undefined) ?? params.service,
    environment:
      (slo.groupings?.['service.environment'] as string | undefined) ?? params.environment,
    transactionType:
      (slo.groupings?.['transaction.type'] as string | undefined) ?? params.transactionType,
    transactionName:
      (slo.groupings?.['transaction.name'] as string | undefined) ?? params.transactionName,
  };
};

export function getApmSourceFieldLink({
  apmLocator,
  serviceName,
  timeRange,
  field,
  value,
}: {
  apmLocator: ApmLocator | undefined;
  serviceName: string;
  timeRange: { from: string; to: string };
  field: ApmSourceField;
  value: string;
}): string | undefined {
  if (!apmLocator || serviceName === ALL_VALUE) return undefined;

  const base = {
    serviceName,
    query: {
      environment: 'ENVIRONMENT_ALL',
      rangeFrom: timeRange.from,
      rangeTo: timeRange.to,
    },
  };

  switch (field) {
    case APM_SOURCE_FIELDS.SERVICE_NAME:
      return apmLocator.getRedirectUrl(base);
    case APM_SOURCE_FIELDS.SERVICE_ENVIRONMENT:
      return apmLocator.getRedirectUrl({ ...base, query: { ...base.query, environment: value } });
    case APM_SOURCE_FIELDS.TRANSACTION_TYPE:
      return apmLocator.getRedirectUrl({
        ...base,
        query: { ...base.query, transactionType: value },
      });
    case APM_SOURCE_FIELDS.TRANSACTION_NAME:
      return apmLocator.getRedirectUrl({
        ...base,
        serviceOverviewTab: 'transactions',
        query: { ...base.query, transactionName: value },
      });
  }
}
