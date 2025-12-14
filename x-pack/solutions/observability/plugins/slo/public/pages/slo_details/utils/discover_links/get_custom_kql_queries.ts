/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsQueryConfig } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import { kqlWithFiltersSchema, type KQLCustomIndicator } from '@kbn/slo-schema';

export function getCustomKqlQueries(indicator: KQLCustomIndicator, esQueryConfig?: EsQueryConfig) {
  const goodKuery = kqlWithFiltersSchema.is(indicator.params.good)
    ? indicator.params.good.kqlQuery
    : indicator.params.good;
  const goodFilters = kqlWithFiltersSchema.is(indicator.params.good)
    ? indicator.params.good.filters
    : [];
  const totalKuery = kqlWithFiltersSchema.is(indicator.params.total)
    ? indicator.params.total.kqlQuery
    : indicator.params.total;
  const totalFilters = kqlWithFiltersSchema.is(indicator.params.total)
    ? indicator.params.total.filters
    : [];

  const customGoodFilter = buildEsQuery({
    kuery: goodKuery,
    filters: goodFilters,
    config: esQueryConfig,
  });
  const customTotalFilter = buildEsQuery({
    kuery: totalKuery,
    filters: totalFilters,
    config: esQueryConfig,
  });
  const customBadFilter = { bool: { filter: customTotalFilter, must_not: customGoodFilter } };

  return {
    goodQuery: customGoodFilter,
    badQuery: customBadFilter,
    totalQuery: customTotalFilter,
  };
}
