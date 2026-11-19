/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  is,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlWithFiltersSchema,
} from '@kbn/slo-schema';

export function convertSliApmParamsToApmAppDeeplinkUrl(
  slo: SLOWithSummaryResponse,
  timeRangeOverride?: { from: string; to: string }
): string | undefined {
  if (
    !is(apmTransactionDurationIndicatorSchema, slo.indicator) &&
    !is(apmTransactionErrorRateIndicatorSchema, slo.indicator)
  ) {
    return undefined;
  }

  const {
    indicator: {
      params: { environment, filter, service, transactionName, transactionType },
    },
    timeWindow: { duration },
  } = slo;

  const qs = new URLSearchParams('comparisonEnabled=true');

  if (environment) {
    qs.append('environment', environment === ALL_VALUE ? 'ENVIRONMENT_ALL' : environment);
  }

  if (transactionType) {
    qs.append('transactionType', transactionType === ALL_VALUE ? '' : transactionType);
  }

  if (timeRangeOverride) {
    qs.append('rangeFrom', timeRangeOverride.from);
    qs.append('rangeTo', timeRangeOverride.to);
  } else if (duration) {
    qs.append('rangeFrom', `now-${duration}`);
    qs.append('rangeTo', 'now');
  }

  const kueryParams: string[] = [];
  if (transactionName && transactionName !== ALL_VALUE) {
    kueryParams.push(`transaction.name : "${transactionName}"`);
  }
  // The APM app only accepts a KQL string, so filter pills (`filters`) can't be forwarded
  const filterKuery = is(kqlWithFiltersSchema, filter) ? filter.kqlQuery : filter;
  const filterIndex = filterKuery ? kueryParams.push(filterKuery) - 1 : -1;

  const groupings = slo.groupings ?? {};

  if ('instanceId' in slo && slo.instanceId !== ALL_VALUE) {
    Object.entries(groupings).forEach(([field, value]) => {
      if (field !== 'service.name' && value != null) {
        kueryParams.push(`${field} : "${value}"`);
      }
    });
  }

  // Parenthesize the user KQL so `or` clauses don't escape the `and` scoping clauses
  if (filterIndex >= 0 && kueryParams.length > 1) {
    kueryParams[filterIndex] = `(${kueryParams[filterIndex]})`;
  }

  if (kueryParams.length > 0) {
    qs.append('kuery', kueryParams.join(' and '));
  }

  const serviceName = groupings['service.name'] ?? service;

  return `/app/apm/services/${serviceName}/overview?${qs.toString()}`;
}
