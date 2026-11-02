/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import Boom from '@hapi/boom';
import type { BoolQuery, DataViewBase, EsQueryConfig, Filter } from '@kbn/es-query';
import { buildEsQuery, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { SearchConfigurationType } from '../../common/custom_threshold_rule/types';

export const getParsedFilterQuery: (
  filter: string | undefined,
  dataView?: DataViewBase
) => NonNullable<QueryDslQueryContainer>[] = (filter, dataView) => {
  if (!filter) return [];

  try {
    const parsedQuery = toElasticsearchQuery(fromKueryExpression(filter), dataView);
    return [parsedQuery];
  } catch (error) {
    throw Boom.badRequest(`Invalid filter query: ${error.message}`);
  }
};

export const getSearchConfigurationBoolQuery: (
  searchConfiguration: SearchConfigurationType,
  additionalFilters: Filter[],
  dataView?: DataViewBase,
  esQueryConfig?: EsQueryConfig
) => { bool: BoolQuery } = (searchConfiguration, additionalFilters, dataView, esQueryConfig) => {
  try {
    const searchConfigurationFilters = (searchConfiguration.filter as Filter[]) || [];
    const filters = [...additionalFilters, ...searchConfigurationFilters];

    return buildEsQuery(dataView, searchConfiguration.query, filters, esQueryConfig);
  } catch (error) {
    throw Boom.badRequest(`Invalid search query: ${error.message}`);
  }
};
