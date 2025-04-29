/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getESQuery = (query: any) => {
  try {
    return JSON.stringify(query, null, 4)
      .replace(/"{query}"/g, 'query')
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n')
      .trim();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error parsing ES query', e);
    return '{}';
  }
};
