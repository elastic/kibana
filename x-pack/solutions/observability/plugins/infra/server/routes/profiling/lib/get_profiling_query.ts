/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery } from '@kbn/observability-plugin/server';

/** Profiling events matching the kuery in the time range, given in milliseconds */
export function getProfilingQuery({
  kuery,
  from,
  to,
}: {
  kuery: string;
  from: number;
  to: number;
}): QueryDslQueryContainer {
  return {
    bool: {
      filter: [
        ...kqlQuery(kuery),
        {
          range: {
            ['@timestamp']: {
              gte: String(from / 1000),
              lt: String(to / 1000),
              format: 'epoch_second',
            },
          },
        },
      ],
    },
  };
}
