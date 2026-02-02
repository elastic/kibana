/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { QuerySchema } from '@kbn/slo-schema';
import { kqlQuerySchema } from '@kbn/slo-schema';
import { buildEsQuery } from '@kbn/es-query';
import type { DataViewBase } from '@kbn/es-query';
import { isEmpty } from 'lodash';

export function getElasticsearchQueryOrThrow(
  kuery: QuerySchema = '',
  dataView?: DataViewBase
): QueryDslQueryContainer {
  try {
    if (isEmpty(kuery)) {
      return { match_all: {} };
    }
    const kqlQuery = kqlQuerySchema.is(kuery) ? kuery : kuery.kqlQuery;
    const filters = kqlQuerySchema.is(kuery) ? [] : kuery.filters;
    return buildEsQuery(
      dataView,
      {
        query: kqlQuery,
        language: 'kuery',
      },
      filters,
      {
        allowLeadingWildcards: true,
      }
    );
  } catch (err) {
    // @ts-expect-error `getElasticsearchQueryOrThrow` but it doesn't throw :shrug:
    return [];
  }
}
