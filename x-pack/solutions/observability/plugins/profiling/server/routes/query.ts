/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { ATTR_TIMESTAMP } from '@kbn/observability-ui-semantic-conventions';

export interface ProjectTimeQuery {
  bool: QueryDslBoolQuery;
}

export function createCommonFilter({
  kuery,
  timeFrom,
  timeTo,
}: {
  kuery: string;
  timeFrom: number;
  timeTo: number;
}): ProjectTimeQuery {
  return {
    bool: {
      filter: [
        ...kqlQuery(kuery),
        {
          range: {
            [ATTR_TIMESTAMP]: {
              gte: String(timeFrom),
              lt: String(timeTo),
              format: 'epoch_second',
              boost: 1.0,
            },
          },
        },
      ],
    },
  };
}
