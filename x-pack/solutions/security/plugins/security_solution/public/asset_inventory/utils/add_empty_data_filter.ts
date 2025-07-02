/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { ASSET_FIELDS } from '../constants';

/**
 * This function adds an empty filter object to the filters array to remove empty entity.id data
 */
export const addEmptyDataFilter = (filters: Filter[], index: string) => {
  return [
    ...filters,
    {
      meta: {
        key: ASSET_FIELDS.ENTITY_ID,
        index,
        negate: true,
        type: 'phrase',
        params: {
          query: '',
        },
      },
      query: {
        match_phrase: {
          [ASSET_FIELDS.ENTITY_ID]: '',
        },
      },
    },
  ];
};

/**
 * This function adds an empty filter object to the query bool filter array to remove empty entity.id data
 */
export const addEmptyDataFilterQuery = (queryBoolFilter: QueryDslQueryContainer[]) => {
  const filterQuery = { match_phrase: { [ASSET_FIELDS.ENTITY_ID]: '' } };

  return [...queryBoolFilter, filterQuery];
};
