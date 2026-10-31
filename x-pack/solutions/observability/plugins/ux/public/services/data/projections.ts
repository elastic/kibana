/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SetupUX } from '../../../typings/ui_filters';
import { getEsFilter } from './get_es_filter';
import { rangeQuery } from './range_query';
import {
  rumErrorsFilter,
  rumPageExitOrInpFilter,
  rumPageLoadFilter,
  rumUrlWildcardFilter,
} from './rum_otel_filters';

export function getRumPageLoadTransactionsProjection({
  setup,
  urlQuery,
  checkFetchStartFieldExists = true,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  checkFetchStartFieldExists?: boolean;
  start: number;
  end: number;
}) {
  const { uiFilters } = setup;

  const bool = {
    filter: [
      ...rangeQuery(start, end),
      rumPageLoadFilter(),
      ...(checkFetchStartFieldExists
        ? [
            {
              // Classic RUM sometimes lacks marks; OTel documentLoad has no fetchStart mark.
              // Keep as optional soft filter via should so OTel docs still match.
              bool: {
                should: [
                  {
                    exists: {
                      field: 'transaction.marks.navigationTiming.fetchStart',
                    },
                  },
                  { term: { name: 'documentLoad' } },
                ],
                minimum_should_match: 1,
              },
            },
          ]
        : []),
      ...(urlQuery ? [rumUrlWildcardFilter(urlQuery)] : []),
      ...getEsFilter(uiFilters),
    ],
    must_not: [...getEsFilter(uiFilters, true)],
  };

  return {
    query: {
      bool,
    },
  };
}

export function getRumPageExitTransactionsProjection({
  setup,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  start: number;
  end: number;
}) {
  const { uiFilters } = setup;

  const bool = {
    filter: [
      ...rangeQuery(start, end),
      rumPageExitOrInpFilter(),
      ...(urlQuery ? [rumUrlWildcardFilter(urlQuery)] : []),
      ...getEsFilter(uiFilters),
    ],
    must_not: [...getEsFilter(uiFilters, true)],
  };

  return {
    query: {
      bool,
    },
  };
}

export interface RumErrorsProjection {
  query: {
    bool: {
      filter: QueryDslQueryContainer[];
      must_not: QueryDslQueryContainer[];
    };
  };
}

export function getRumErrorsProjection({
  setup,
  urlQuery,
  start,
  end,
}: {
  setup: SetupUX;
  urlQuery?: string;
  start: number;
  end: number;
}): RumErrorsProjection {
  return {
    query: {
      bool: {
        filter: [
          ...rangeQuery(start, end),
          rumErrorsFilter(),
          ...getEsFilter(setup.uiFilters),
          ...(urlQuery ? [rumUrlWildcardFilter(urlQuery)] : []),
        ],
        must_not: [...getEsFilter(setup.uiFilters, true)],
      },
    },
  };
}
