/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

/** Convert a KQL string to ES filters. Invalid syntax matches nothing. */
export const kueryFilters = (kuery?: string): object[] => {
  const text = kuery?.trim();
  if (!text) {
    return [];
  }
  try {
    return [toElasticsearchQuery(fromKueryExpression(text))];
  } catch {
    return [{ match_none: {} }];
  }
};
