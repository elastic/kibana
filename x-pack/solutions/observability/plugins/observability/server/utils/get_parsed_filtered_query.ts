/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  BoolQuery,
  buildEsQuery,
  EsQueryConfig,
  Filter,
  fromKueryExpression,
  toElasticsearchQuery,
} from '@kbn/es-query';
import { SearchConfigurationType } from '../../common/custom_threshold_rule/types';

export const getParsedFilterQuery: (filter: string | undefined) => Array<Record<string, any>> = (
  filter
) => {
  if (!filter) return [];

  try {
    const parsedQuery = toElasticsearchQuery(fromKueryExpression(filter));
    return [parsedQuery];
  } catch (error) {
    throw Boom.badRequest(`Invalid filter query: ${error.message}`);
  }
};

export const getSearchConfigurationBoolQuery: (
  searchConfiguration: SearchConfigurationType,
  additionalFilters: Filter[],
  esQueryConfig?: EsQueryConfig
) => { bool: BoolQuery } = (searchConfiguration, additionalFilters, esQueryConfig) => {
  try {
    const searchConfigurationFilters = (searchConfiguration.filter as Filter[]) || [];
    const filters = [...additionalFilters, ...searchConfigurationFilters];

    return buildEsQuery(undefined, searchConfiguration.query, filters, esQueryConfig);
  } catch (error) {
    throw Boom.badRequest(`Invalid search query: ${error.message}`);
  }
};
