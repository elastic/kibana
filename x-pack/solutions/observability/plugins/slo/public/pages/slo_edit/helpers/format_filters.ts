/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QuerySchema, FiltersSchema } from '@kbn/slo-schema';
import { is, kqlQuerySchemaZod, kqlWithFiltersSchemaZod } from '@kbn/slo-schema';

export const formatAllFilters = (
  globalFilters: QuerySchema = '',
  groupByCardinalityFilters: FiltersSchema
): QuerySchema => {
  if (is(kqlQuerySchemaZod, globalFilters)) {
    return { kqlQuery: globalFilters, filters: groupByCardinalityFilters };
  } else if (is(kqlWithFiltersSchemaZod, globalFilters)) {
    return {
      kqlQuery: globalFilters.kqlQuery,
      filters: [...globalFilters.filters, ...groupByCardinalityFilters],
    };
  } else {
    return { kqlQuery: '', filters: groupByCardinalityFilters };
  }
};
