/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SERVICE_ENVIRONMENT } from '@kbn/apm-types';

const ENVIRONMENT_ALL = 'ENVIRONMENT_ALL';
const ENVIRONMENT_NOT_DEFINED = 'ENVIRONMENT_NOT_DEFINED';

/**
 * Generates an Elasticsearch query filter for service environment.
 * - Empty string or undefined: no filter (all environments)
 * - 'ENVIRONMENT_ALL': no filter (all environments)
 * - 'ENVIRONMENT_NOT_DEFINED': matches docs where environment is not set
 * - Any other value: matches docs with that specific environment
 */
export function environmentQuery(environment: string | undefined): QueryDslQueryContainer[] {
  // Empty string or ENVIRONMENT_ALL means "all environments"
  if (!environment || environment === ENVIRONMENT_ALL) {
    return [];
  }

  if (environment === ENVIRONMENT_NOT_DEFINED) {
    return [
      {
        bool: {
          should: [
            {
              term: { [SERVICE_ENVIRONMENT]: ENVIRONMENT_NOT_DEFINED },
            },
            {
              bool: {
                must_not: [
                  {
                    exists: { field: SERVICE_ENVIRONMENT },
                  },
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ];
  }

  return [{ term: { [SERVICE_ENVIRONMENT]: environment } }];
}
