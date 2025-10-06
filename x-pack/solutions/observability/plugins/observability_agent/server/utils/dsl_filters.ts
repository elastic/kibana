/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash';

export function buildTimeRangeFilter(
  timeField: string,
  { start, end }: { start: string; end: string }
): QueryDslQueryContainer {
  return {
    range: {
      [timeField]: {
        gte: start,
        lt: end,
      },
    },
  };
}

export function buildKqlFilter(kuery?: string): QueryDslQueryContainer[] {
  const hasKuery = !isEmpty(kuery?.trim());
  if (hasKuery) {
    return [toElasticsearchQuery(fromKueryExpression(kuery!))];
  }

  return [];
}
