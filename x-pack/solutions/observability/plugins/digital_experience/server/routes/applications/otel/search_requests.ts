/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { dateRangeQuery, termQuery, termsQuery } from '@kbn/es-query';
import {
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_STATUS_CODE,
  KIND,
  OTEL_EVENT_NAME,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  STATUS_CODE,
  TELEMETRY_SDK_LANGUAGE,
} from '@kbn/apm-types';
import type { CoreWebVital } from '../../../../common/core_web_vitals';
import { CORE_WEB_VITAL } from '../../../../common/core_web_vitals';
import { LAST_SEEN_AGGREGATION } from '../../../lib/helpers/aggregations';
import { dateHistogram } from '../../../lib/helpers/time_series';
import { environmentFilter, environmentNotDefinedFilter } from '../../../lib/helpers/environment';
import { vitalStatsAggs } from '../../../lib/helpers/web_vitals';
import {
  MAX_APPLICATIONS_PER_SOURCE,
  MAX_ENVIRONMENTS,
  MAX_ENVIRONMENTS_PER_APPLICATION,
} from '../constants';
import {
  BROWSER_SDK_LANGUAGE,
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
  SPAN_KIND_CLIENT,
  SPAN_STATUS_ERROR,
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
} from '../../../../common/otel_data';

export interface SearchParams {
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
}

export interface SpansSearchParams extends SearchParams {
  /** The applications `logsSearch` found, so both searches cover the same ones. */
  serviceNames: string[];
}

// `service.environment` aliases the deprecated `deployment.environment`; newer SDKs write the
// other.
const ENVIRONMENT_FIELDS = [SERVICE_ENVIRONMENT, RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME];

const browserDocuments = (start: number, end: number) => [
  ...dateRangeQuery(start, end),
  // Browser SDKs only: the OTel indices also hold backend services (java, nodejs, python…).
  ...termQuery(TELEMETRY_SDK_LANGUAGE, BROWSER_SDK_LANGUAGE),
];

const eventCount = (eventName: string) => ({
  filter: { bool: { filter: termQuery(OTEL_EVENT_NAME, eventName) } },
});

const environmentTerms = (size: number) => ({
  environments: { terms: { field: SERVICE_ENVIRONMENT, size } },
  environmentNames: { terms: { field: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME, size } },
});

// The filter's doc count is the number of samples, and names match in any case, as semconv writes
// `cls` and the web-vitals library `CLS`.
const webVital = (vital: CoreWebVital) => ({
  filter: {
    bool: {
      filter: [
        ...termQuery(OTEL_EVENT_NAME, EVENT_WEB_VITAL),
        { term: { [WEB_VITAL_NAME]: { value: vital, case_insensitive: true } } },
        { exists: { field: WEB_VITAL_VALUE } },
      ],
    },
  },
  aggs: vitalStatsAggs(WEB_VITAL_VALUE, vital),
});

/** The applications in the selected environment, and every environment so the picker lists all. */
const applicationsByEnvironment = (
  environment: string | undefined,
  aggs: { applications: estypes.AggregationsAggregationContainer } & Record<
    string,
    estypes.AggregationsAggregationContainer
  >
) => ({
  ...environmentTerms(MAX_ENVIRONMENTS),
  environmentNotDefined: { filter: environmentNotDefinedFilter(ENVIRONMENT_FIELDS) },
  inEnvironment: { filter: environmentFilter(ENVIRONMENT_FIELDS, environment), aggs },
});

/** Page loads, JS errors and web vitals per application, from the logs. */
export const logsSearch = ({ start, end, environment }: SearchParams): estypes.SearchRequest => ({
  index: OTEL_LOGS_INDEX,
  size: 0,
  track_total_hits: false,
  ignore_unavailable: true,
  // A shard that fails fails the search, so the source is reported as unavailable, not incomplete.
  allow_partial_search_results: false,
  query: {
    bool: {
      filter: [
        ...browserDocuments(start, end),
        // Only the events the metrics count.
        ...termsQuery(OTEL_EVENT_NAME, [EVENT_NAVIGATION_TIMING, EVENT_WEB_VITAL, EVENT_EXCEPTION]),
      ],
    },
  },
  aggs: applicationsByEnvironment(environment, {
    applications: {
      terms: {
        field: SERVICE_NAME,
        size: MAX_APPLICATIONS_PER_SOURCE,
        // The cap keeps the applications with the most page loads. Ordering by a
        // sub-aggregation is approximate across shards, so past the cap the cut-off
        // may not be exact.
        order: { pageLoads: 'desc' },
      },
      aggs: {
        ...environmentTerms(MAX_ENVIRONMENTS_PER_APPLICATION),
        pageLoads: eventCount(EVENT_NAVIGATION_TIMING),
        jsErrors: eventCount(EVENT_EXCEPTION),
        lcp: webVital(CORE_WEB_VITAL.lcp),
        inp: webVital(CORE_WEB_VITAL.inp),
        cls: webVital(CORE_WEB_VITAL.cls),
        fcp: webVital(CORE_WEB_VITAL.fcp),
        ttfb: webVital(CORE_WEB_VITAL.ttfb),
        lastSeen: LAST_SEEN_AGGREGATION,
      },
    },
    pageLoadsOverTime: {
      ...eventCount(EVENT_NAVIGATION_TIMING),
      aggs: { histogram: dateHistogram(start, end) },
    },
  }),
});

// A request without a response (e.g. a network error) has no status code but an error span status.
const requestWithoutResponse = termQuery(STATUS_CODE, SPAN_STATUS_ERROR);

/** HTTP requests (client spans with a method) and the failed ones per application, from traces. */
export const spansSearch = ({
  start,
  end,
  environment,
  serviceNames,
}: SpansSearchParams): estypes.SearchRequest => ({
  index: OTEL_TRACES_INDEX,
  size: 0,
  track_total_hits: false,
  ignore_unavailable: true,
  allow_partial_search_results: false,
  query: {
    bool: {
      filter: [
        ...browserDocuments(start, end),
        ...termQuery(KIND, SPAN_KIND_CLIENT),
        { exists: { field: HTTP_REQUEST_METHOD } },
      ],
    },
  },
  // Only the selected environment: the picker's environments come from the logs, which define the
  // applications.
  aggs: {
    inEnvironment: {
      filter: environmentFilter(ENVIRONMENT_FIELDS, environment),
      aggs: {
        applications: {
          terms: { field: SERVICE_NAME, size: serviceNames.length, include: serviceNames },
          aggs: {
            ...environmentTerms(MAX_ENVIRONMENTS_PER_APPLICATION),
            lastSeen: LAST_SEEN_AGGREGATION,
            // Requests with a known outcome: a response status, or none because the request failed.
            requests: {
              filter: {
                bool: {
                  should: [
                    { exists: { field: HTTP_RESPONSE_STATUS_CODE } },
                    ...requestWithoutResponse,
                  ],
                  minimum_should_match: 1,
                },
              },
            },
            // Failed: an HTTP error status (4xx or 5xx), or no response.
            failed: {
              filter: {
                bool: {
                  should: [
                    { range: { [HTTP_RESPONSE_STATUS_CODE]: { gte: 400 } } },
                    ...requestWithoutResponse,
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          },
        },
      },
    },
  },
});
