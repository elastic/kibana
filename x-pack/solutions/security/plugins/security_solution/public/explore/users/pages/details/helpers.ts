/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';

export const euidDslFilterToPageFilters = (dsl: QueryDslQueryContainer | undefined): Filter[] => {
  if (dsl == null) return [];
  return [{ meta: { alias: null, negate: false, disabled: false }, query: dsl }];
};

export { userNameExistsFilter } from '../../../../common/components/visualization_actions/utils';

export const getUsersDetailsPageFilters = (userName: string): Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'user.name',
      value: userName,
      params: {
        query: userName,
      },
    },
    query: {
      match: {
        'user.name': {
          query: userName,
          type: 'phrase',
        },
      },
    },
  },
];

/**
 * Kibana {@link Filter} clauses for Events (and similar) views: one phrase match per
 * non-empty identity field (AND semantics when combined in the query bar).
 */
export const getIdentityFieldsPageFilters = (identityFields: Record<string, string>): Filter[] =>
  Object.entries(identityFields)
    .filter(([, fieldValue]) => typeof fieldValue === 'string' && fieldValue.trim() !== '')
    .map(([fieldKey, fieldValue]) => ({
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: fieldKey,
        value: fieldValue,
        params: {
          query: fieldValue,
        },
      },
      query: {
        match: {
          [fieldKey]: {
            query: fieldValue,
            type: 'phrase',
          },
        },
      },
    }));
