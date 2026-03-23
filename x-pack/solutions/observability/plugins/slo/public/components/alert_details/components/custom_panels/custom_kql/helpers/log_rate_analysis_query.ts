/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import type { GroupingsSchema, KQLCustomIndicator } from '@kbn/slo-schema';
import { kqlWithFiltersSchema } from '@kbn/slo-schema';

export const getESQueryForLogRateAnalysis = (
  params: KQLCustomIndicator['params'],
  groupings?: GroupingsSchema
): QueryDslQueryContainer => {
  const { filter, good, total } = params;

  const filterKuery = kqlWithFiltersSchema.is(filter) ? filter.kqlQuery : filter;

  const filterFilters: Filter[] = [];
  if (kqlWithFiltersSchema.is(filter)) {
    filter.filters.forEach((i) => filterFilters.push(i));
  }

  const goodKuery = kqlWithFiltersSchema.is(good) ? good.kqlQuery : good;
  const goodFilters = kqlWithFiltersSchema.is(good) ? good.filters : [];

  const totalKuery = kqlWithFiltersSchema.is(total) ? total.kqlQuery : total;
  const totalFilters = kqlWithFiltersSchema.is(total) ? total.filters : [];

  const customGoodFilter = buildEsQuery({ kuery: goodKuery, filters: goodFilters });
  const customTotalFilter = buildEsQuery({ kuery: totalKuery, filters: totalFilters });
  const customFilters = buildEsQuery({ kuery: filterKuery, filters: filterFilters });

  const groupByFilters: Filter[] = [];
  const hasGroupings = groupings && Object.entries(groupings).length > 0;
  if (hasGroupings) {
    const groupingFilters = Object.entries(groupings).map(([field, value]) => ({
      meta: {
        disabled: false,
        negate: false,
        alias: null,
        key: field,
        params: {
          query: value,
        },
        type: 'phrase',
        index: params.index,
      },
      $state: {
        store: FilterStateStore.APP_STATE,
      },
      query: {
        match_phrase: {
          [field]: value,
        },
      },
    }));

    groupByFilters.push(...groupingFilters);
  }

  const customGroupByFilters = buildEsQuery({ kuery: '', filters: groupByFilters });

  const finalQuery = {
    bool: {
      filter: [customTotalFilter, customFilters, customGroupByFilters],
      must_not: customGoodFilter,
    },
  };
  return finalQuery;
};
