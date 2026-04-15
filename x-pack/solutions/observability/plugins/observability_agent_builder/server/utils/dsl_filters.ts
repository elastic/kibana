/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash';

export function timeRangeFilter(
  timeField: string,
  { start, end }: { start: number; end: number }
): QueryDslQueryContainer[] {
  if (!start || !end) {
    return [];
  }

  return [
    {
      range: {
        [timeField]: {
          gte: start,
          lt: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}

export function kqlFilter(kuery?: string): QueryDslQueryContainer[] {
  const hasKuery = !isEmpty(kuery?.trim());
  if (hasKuery) {
    return [toElasticsearchQuery(fromKueryExpression(kuery!))];
  }

  return [];
}

export function environmentFilter(environment?: string) {
  if (!environment) {
    return [];
  }
  return [{ term: { 'service.environment': environment } }];
}

export function termFilter<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null
): QueryDslQueryContainer[] {
  if (!value) {
    return [];
  }

  return [{ term: { [field]: value } }];
}
