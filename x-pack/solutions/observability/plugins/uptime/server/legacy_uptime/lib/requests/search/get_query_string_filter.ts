/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getQueryStringFilter = (query: string) => {
  let queryString = query;
  if (hasReservedCharsF(query) && !includesOperator(query.toLowerCase())) {
    // if user doesn't specify any query string syntax we use wildcard by default
    queryString = `*${query}* or tags:${query}*`;
  }

  if (Number(query)) {
    queryString = `url.port:${query} or ${query}`;
  }

  return {
    query_string: {
      query: queryString,
      fields: [
        'monitor.id.text',
        'monitor.name.text',
        'url.full.text',
        'synthetics.step.name',
        'synthetics.journey.name',
      ],
    },
  };
};

const includesOperator = (query: string) => {
  return query.includes(' or ') || query.includes(' and ');
};

// check if it has reserved characters for query string syntax
const hasReservedCharsF = (str: string) => {
  const format = /^[a-zA-Z]+$/;
  return format.test(str);
};
