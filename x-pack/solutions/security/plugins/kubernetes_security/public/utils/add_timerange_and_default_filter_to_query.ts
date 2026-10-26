/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FILTER, DEFAULT_FILTER_QUERY } from '../../common/constants';

/**
 * Add DEFAULT_FILTER and startDate and endDate filter for '@timestamp' field into query.
 *
 * Used by frontend components
 *
 * @param  {String | undefined} query Example: '{"bool":{"must":[],"filter":[],"should":[],"must_not":[]}}'
 * @param  {String} startDate Example: '2022-06-08T18:52:15.532Z'
 * @param  {String} endDate Example: '2022-06-09T17:52:15.532Z'
 * @return {String} Add startDate and endDate as a '@timestamp' range filter in query and return.
 *                  If startDate or endDate is invalid Date string, or that query is not
 *                  in the right format, return a default query.
 */

export const addTimerangeAndDefaultFilterToQuery = (
  query: string | undefined,
  startDate: string,
  endDate: string
) => {
  if (!(query && !isNaN(Date.parse(startDate)) && !isNaN(Date.parse(endDate)))) {
    return DEFAULT_FILTER_QUERY;
  }

  try {
    const parsedQuery = JSON.parse(query);
    if (!parsedQuery.bool) {
      throw new Error("Field 'bool' does not exist in query.");
    }

    const range = {
      range: {
        '@timestamp': {
          gte: startDate,
          lte: endDate,
        },
      },
    };
    if (parsedQuery.bool.filter) {
      parsedQuery.bool.filter = [DEFAULT_FILTER, ...parsedQuery.bool.filter, range];
    } else {
      parsedQuery.bool.filter = [range];
    }

    return JSON.stringify(parsedQuery);
  } catch {
    return DEFAULT_FILTER_QUERY;
  }
};
