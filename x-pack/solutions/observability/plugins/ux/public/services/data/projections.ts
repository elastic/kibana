/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  ATTR_AGENT_NAME,
  ATTR_PROCESSOR_EVENT,
  ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START,
  ATTR_TRANSACTION_TYPE,
  ATTR_URL_FULL,
  PROCESSOR_EVENT_VALUE_ERROR,
  PROCESSOR_EVENT_VALUE_TRANSACTION,
  TRANSACTION_TYPE_VALUE_PAGE_EXIT,
  TRANSACTION_TYPE_VALUE_PAGE_LOAD,
} from '@kbn/observability-ui-semantic-conventions';
import { SetupUX } from '../../../typings/ui_filters';
import { getEsFilter } from './get_es_filter';
import { rangeQuery } from './range_query';

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
      { term: { [ATTR_TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE_PAGE_LOAD } },
      { terms: { [ATTR_PROCESSOR_EVENT]: [PROCESSOR_EVENT_VALUE_TRANSACTION] } },
      ...(checkFetchStartFieldExists
        ? [
            {
              // Adding this filter to cater for some inconsistent rum data
              // not available on aggregated transactions
              exists: {
                field: ATTR_TRANSACTION_MARKS_NAVIGATION_TIMING_FETCH_START,
              },
            },
          ]
        : []),
      ...(urlQuery
        ? [
            {
              wildcard: {
                [ATTR_URL_FULL]: `*${urlQuery}*`,
              },
            },
          ]
        : []),
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
      { term: { [ATTR_TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE_PAGE_EXIT } },
      { terms: { [ATTR_PROCESSOR_EVENT]: [PROCESSOR_EVENT_VALUE_TRANSACTION] } },
      ...(urlQuery
        ? [
            {
              wildcard: {
                [ATTR_URL_FULL]: `*${urlQuery}*`,
              },
            },
          ]
        : []),
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
          { term: { [ATTR_AGENT_NAME]: 'rum-js' } },
          {
            terms: {
              [ATTR_PROCESSOR_EVENT]: [PROCESSOR_EVENT_VALUE_ERROR],
            },
          },
          ...getEsFilter(setup.uiFilters),
          ...(urlQuery
            ? [
                {
                  wildcard: {
                    ATTR_URL_FULL: `*${urlQuery}*`,
                  },
                },
              ]
            : []),
        ],
        must_not: [...getEsFilter(setup.uiFilters, true)],
      },
    },
  };
}
