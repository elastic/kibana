/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isPlainObject, isString } from 'lodash/fp';

import type { JsonObject } from '@kbn/utility-types';

export const parseFilterQuery = (filterQuery: string): JsonObject => {
  try {
    if (filterQuery && isString(filterQuery) && !isEmpty(filterQuery)) {
      const parsedFilterQuery = JSON.parse(filterQuery);
      if (
        !parsedFilterQuery ||
        !isPlainObject(parsedFilterQuery) ||
        Array.isArray(parsedFilterQuery)
      ) {
        throw new Error('expected value to be an object');
      }
      return parsedFilterQuery;
    }
    return {};
  } catch (err) {
    throw new Error(
      `Failed to parse query: ${JSON.stringify(err)}, query: ${JSON.stringify(filterQuery)}`
    );
  }
};
