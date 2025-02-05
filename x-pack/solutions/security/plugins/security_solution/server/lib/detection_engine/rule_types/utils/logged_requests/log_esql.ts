/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const logEsqlRequest = (
  requestBody: {
    query: string;
    filter: QueryDslQueryContainer;
  },
  requestQueryParams?: { drop_null_columns?: boolean }
): string => {
  const urlParams = Object.entries(requestQueryParams ?? {})
    .reduce<string[]>((acc, [key, value]) => {
      if (value != null) {
        acc.push(`${key}=${value}`);
      }

      return acc;
    }, [])
    .join('&');

  return `POST _query${urlParams ? `?${urlParams}` : ''}\n${JSON.stringify(requestBody, null, 2)}`;
};
