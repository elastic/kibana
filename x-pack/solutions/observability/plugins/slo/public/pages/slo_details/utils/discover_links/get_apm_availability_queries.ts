/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EsQueryConfig } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import {
  ALL_VALUE,
  kqlWithFiltersSchema,
  type APMTransactionErrorRateIndicator,
} from '@kbn/slo-schema';

export function getApmAvailabilityQueries(
  indicator: APMTransactionErrorRateIndicator,
  esQueryConfig?: EsQueryConfig
) {
  const apmFilters: Array<Record<string, any>> = [
    { term: { 'metricset.name': 'transaction' } },
    { terms: { 'event.outcome': ['success', 'failure'] } },
  ];
  if (indicator.params.service !== ALL_VALUE) {
    apmFilters.push({
      term: { 'service.name': indicator.params.service },
    });
  }
  if (indicator.params.environment !== ALL_VALUE) {
    apmFilters.push({
      term: { 'service.environment': indicator.params.environment },
    });
  }
  if (indicator.params.transactionType !== ALL_VALUE) {
    apmFilters.push({
      term: { 'transaction.type': indicator.params.transactionType },
    });
  }
  if (indicator.params.transactionName !== ALL_VALUE) {
    apmFilters.push({
      term: { 'transaction.name': indicator.params.transactionName },
    });
  }

  if (indicator.params.filter) {
    const filterKuery = kqlWithFiltersSchema.is(indicator.params.filter)
      ? indicator.params.filter.kqlQuery
      : indicator.params.filter;
    const filter = buildEsQuery({
      kuery: filterKuery,
      filters: kqlWithFiltersSchema.is(indicator.params.filter)
        ? indicator.params.filter.filters
        : [],
      config: esQueryConfig,
    });
    apmFilters.push(filter);
  }

  return {
    totalQuery: {
      bool: {
        filter: apmFilters,
      },
    },
    goodQuery: {
      bool: {
        filter: apmFilters.concat([{ term: { 'event.outcome': 'success' } }]),
      },
    },
    badQuery: {
      bool: {
        filter: apmFilters.concat([{ term: { 'event.outcome': 'failure' } }]),
      },
    },
  };
}
