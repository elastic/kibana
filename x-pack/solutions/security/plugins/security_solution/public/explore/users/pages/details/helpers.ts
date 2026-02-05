/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

/**
 * Builds filters for user details page following entity store EUID priority logic.
 * Priority order: user.entity.id > user.id > user.email > user.name
 */
export const getUsersDetailsPageFilters = (entityIdentifiers: Record<string, string>): Filter[] => {
  const filters: Filter[] = [];

  // Priority 1: user.entity.id
  if (entityIdentifiers['user.entity.id']) {
    filters.push(createFilter('user.entity.id', entityIdentifiers['user.entity.id']));
    return filters;
  }

  // Priority 2: user.id
  if (entityIdentifiers['user.id']) {
    filters.push(createFilter('user.id', entityIdentifiers['user.id']));
    return filters;
  }

  // Priority 3: user.email
  if (entityIdentifiers['user.email']) {
    filters.push(createFilter('user.email', entityIdentifiers['user.email']));
    return filters;
  }

  // Priority 4: user.name
  if (entityIdentifiers['user.name']) {
    filters.push(createFilter('user.name', entityIdentifiers['user.name']));
    return filters;
  }

  return filters;
};

/**
 * Helper function to create a Filter object for a given field and value
 */
const createFilter = (field: string, value: string): Filter => ({
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: field,
    value,
    params: {
      query: value,
    },
  },
  query: {
    match: {
      [field]: {
        query: value,
        type: 'phrase',
      },
    },
  },
});

/**
 * Creates a filter that checks for user EUID existence following entity store priority:
 * user.entity.id > user.id > user.email > user.name
 */
export const userNameExistsFilter: Filter[] = [
  {
    query: {
      bool: {
        should: [
          {
            exists: {
              field: 'user.entity.id',
            },
          },
          {
            exists: {
              field: 'user.id',
            },
          },
          {
            exists: {
              field: 'user.email',
            },
          },
          {
            exists: {
              field: 'user.name',
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"query": {"bool": {"should": [{"exists": {"field": "user.entity.id"}},{"exists": {"field": "user.id"}},{"exists": {"field": "user.email"}},{"exists": {"field": "user.name"}}],"minimum_should_match": 1}}}',
    },
  },
];
