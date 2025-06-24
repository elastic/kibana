/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlWithFiltersSchema } from '@kbn/slo-schema';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/observability-plugin/public';
import { KQLCustomIndicator, GroupingsSchema, ALL_VALUE } from '@kbn/slo-schema';
import { isEmpty } from 'lodash';

export const getESQueryForLogRateAnalysis = (
  params: KQLCustomIndicator['params'],
  groupBy?: string | string[],
  groupings?: GroupingsSchema
) => {
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

  if (groupBy && groupings) {
    const groupByFields = [groupBy].flat();
    if (
      !isEmpty(groupings) &&
      groupByFields &&
      groupByFields.length > 0 &&
      groupByFields.every((field) => field === ALL_VALUE) === false
    ) {
      groupByFields.forEach((field) => {
        groupByFilters.push({
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            key: field,
            params: {
              query: groupings[field],
            },
            type: 'phrase',
            index: params.index,
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
          query: {
            match_phrase: {
              [field]: groupings[field],
            },
          },
        });
      });
    }
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
