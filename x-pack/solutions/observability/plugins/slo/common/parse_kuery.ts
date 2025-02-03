/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuerySchema, QuerySchema } from '@kbn/slo-schema';
import { buildEsQuery, fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

export function getElasticsearchQueryOrThrow(kuery: QuerySchema = ''): QueryDslQueryContainer {
  try {
    if (kqlQuerySchema.is(kuery)) {
      return toElasticsearchQuery(fromKueryExpression(kuery));
    } else {
      return buildEsQuery(
        undefined,
        {
          query: kuery?.kqlQuery,
          language: 'kuery',
        },
        kuery?.filters
      );
    }
  } catch (err) {
    return [] as QueryDslQueryContainer;
  }
}
