/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const convertToQueryString = (params: Record<string, unknown>): string => {
  const querystring = Object.entries(params)
    .reduce<string[]>((acc, [key, value]) => {
      if (value != null) {
        acc.push(`${key}=${value}`);
      }
      return acc;
    }, [])
    .join('&');

  return querystring ? `?${querystring}` : '';
};
