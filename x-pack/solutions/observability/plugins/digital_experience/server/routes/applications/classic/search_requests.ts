/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import {
  AGENT_NAME,
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_TYPE,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import type { APMEventESSearchRequest } from '@kbn/apm-data-access-plugin/server';
import { dateRangeQuery, termQuery, termsQuery } from '@kbn/es-query';
import type { CoreWebVital } from '../../../../common/core_web_vitals';
import { CORE_WEB_VITAL } from '../../../../common/core_web_vitals';
import { LAST_SEEN_AGGREGATION } from '../../../lib/helpers/aggregations';
import { dateHistogram } from '../../../lib/helpers/time_series';
import { environmentFilter, environmentNotDefinedFilter } from '../../../lib/helpers/environment';
import { vitalStatsAggs } from '../../../lib/helpers/web_vitals';
import { MAX_ENVIRONMENTS } from '../../../lib/constants';
import { MAX_APPLICATIONS_PER_SOURCE, MAX_ENVIRONMENTS_PER_APPLICATION } from '../constants';
import {
  CLASSIC_RUM_AGENT_NAMES,
  CLS_FIELD,
  EXTERNAL_SPAN_TYPE,
  FCP_FIELD,
  INP_FIELD,
  LCP_FIELD,
  PAGE_EXIT_TRANSACTION_TYPE,
  PAGE_LOAD_TRANSACTION_TYPE,
  TTFB_FIELD,
} from './field_names';

export interface SearchParams {
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
}

const ENVIRONMENT_FIELDS = [SERVICE_ENVIRONMENT];

const pageLoadTransactions = [
  ...termQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
  ...termQuery(TRANSACTION_TYPE, PAGE_LOAD_TRANSACTION_TYPE),
];

const externalSpans = [
  ...termQuery(PROCESSOR_EVENT, ProcessorEvent.span),
  ...termQuery(SPAN_TYPE, EXTERNAL_SPAN_TYPE),
];

// Only the documents the metrics count: the RUM agent also sends resource spans, route changes and
// user interactions, often dozens per page.
const measuredDocuments = {
  bool: {
    should: [
      {
        bool: {
          filter: [
            ...termQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
            ...termsQuery(TRANSACTION_TYPE, [
              PAGE_LOAD_TRANSACTION_TYPE,
              PAGE_EXIT_TRANSACTION_TYPE,
            ]),
          ],
        },
      },
      ...termQuery(PROCESSOR_EVENT, ProcessorEvent.error),
      { bool: { filter: externalSpans } },
    ],
    minimum_should_match: 1,
  },
};

const documentCount = (filter: ReturnType<typeof termQuery>) => ({
  filter: { bool: { filter } },
});

// Fetch / XHR requests with a known outcome; `unknown` is left out, as APM does for its failure
// rate.
const externalSpansWithOutcome = (outcome: 'success' | 'failure') =>
  documentCount([...externalSpans, ...termQuery(EVENT_OUTCOME, outcome)]);

// The documents that have the vital; the filter's doc count is the number of samples.
const webVital = (field: string, vital: CoreWebVital) => ({
  filter: { exists: { field } },
  aggs: vitalStatsAggs(field, vital),
});

/** Page loads, JS errors, HTTP requests and web vitals per application, from the APM indices. */
export const classicSearch = ({
  start,
  end,
  environment,
}: SearchParams): APMEventESSearchRequest => ({
  apm: { events: [ProcessorEvent.transaction, ProcessorEvent.error, ProcessorEvent.span] },
  track_total_hits: false,
  size: 0,
  // A shard that fails fails the search, so the source is reported as unavailable, not incomplete.
  allow_partial_search_results: false,
  query: {
    bool: {
      filter: [
        ...dateRangeQuery(start, end),
        ...termsQuery(AGENT_NAME, CLASSIC_RUM_AGENT_NAMES),
        measuredDocuments,
      ],
    },
  },
  aggs: {
    // Outside the environment filter, so the picker lists every environment.
    environments: { terms: { field: SERVICE_ENVIRONMENT, size: MAX_ENVIRONMENTS } },
    environmentNotDefined: { filter: environmentNotDefinedFilter(ENVIRONMENT_FIELDS) },
    inEnvironment: {
      filter: environmentFilter(ENVIRONMENT_FIELDS, environment),
      aggs: {
        applications: {
          terms: {
            field: SERVICE_NAME,
            size: MAX_APPLICATIONS_PER_SOURCE,
            // The cap keeps the applications with the most page loads.
            order: { pageLoads: 'desc' },
          },
          aggs: {
            environments: {
              terms: { field: SERVICE_ENVIRONMENT, size: MAX_ENVIRONMENTS_PER_APPLICATION },
            },
            pageLoads: documentCount(pageLoadTransactions),
            jsErrors: documentCount(termQuery(PROCESSOR_EVENT, ProcessorEvent.error)),
            httpSuccess: externalSpansWithOutcome('success'),
            httpFailure: externalSpansWithOutcome('failure'),
            lcp: webVital(LCP_FIELD, CORE_WEB_VITAL.lcp),
            inp: webVital(INP_FIELD, CORE_WEB_VITAL.inp),
            cls: webVital(CLS_FIELD, CORE_WEB_VITAL.cls),
            fcp: webVital(FCP_FIELD, CORE_WEB_VITAL.fcp),
            ttfb: webVital(TTFB_FIELD, CORE_WEB_VITAL.ttfb),
            lastSeen: LAST_SEEN_AGGREGATION,
          },
        },
        pageLoadsOverTime: {
          ...documentCount(pageLoadTransactions),
          aggs: { histogram: dateHistogram(start, end) },
        },
      },
    },
  },
});
