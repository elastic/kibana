/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { termQuery, termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME } from '@kbn/apm-types';
import { CORE_WEB_VITAL } from '../../../../common/core_web_vitals';
import { countOf, p75Of } from '../../../lib/helpers/aggregations';
import { dateHistogram } from '../../../lib/helpers/time_series';
import type { OverviewFilters } from '../../../../common/overview_filters';
import {
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  NAVIGATION_TIMING_LOAD_EVENT_END,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import {
  browserDocuments,
  byEnvironment,
  eventCount,
  failedRequests,
  httpRequestDocuments,
  inEnvironmentFilter,
  otelSearchDefaults,
  requestsWithOutcome,
  serviceDocuments,
  webVital,
} from '../../../lib/otel/queries';
import {
  documentFilters,
  filterOptionsAggs,
  filterRuntimeMappings,
  pageLoadFilters,
} from '../../../lib/otel/overview_filters';

export interface OverviewSearchParams {
  serviceName: string;
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
  /** Only the data of the selected browser, OS, device and country, and the page loads of the page. */
  filters?: OverviewFilters;
}

/**
 * Page loads, load time, JS errors, web vitals and the trend of one application, from the logs.
 *
 * Page loads count the navigation-timing events only, so soft navigations (`browser.navigation`)
 * and resource timings (`browser.resource_timing`), which carry timing attributes of their own, are
 * left out.
 *
 * The selected filters narrow the metrics only: the lists of the filters, and the environments of
 * the picker, are over the whole range so that every value stays selectable.
 */
export const logsSearch = ({
  serviceName,
  start,
  end,
  environment,
  filters = {},
}: OverviewSearchParams): estypes.SearchRequest => ({
  ...otelSearchDefaults(OTEL_LOGS_INDEX),
  runtime_mappings: filterRuntimeMappings(),
  query: {
    bool: {
      filter: [
        ...browserDocuments(start, end),
        ...serviceDocuments(serviceName),
        // Only the events the metrics count.
        ...termsQuery(OTEL_EVENT_NAME, [EVENT_NAVIGATION_TIMING, EVENT_WEB_VITAL, EVENT_EXCEPTION]),
      ],
    },
  },
  aggs: {
    ...byEnvironment(
      environment,
      {
        pageLoads: {
          // The web vitals, errors and clicks carry no page URL yet, so only page loads have a page.
          filter: {
            bool: {
              filter: [
                ...termQuery(OTEL_EVENT_NAME, EVENT_NAVIGATION_TIMING),
                ...pageLoadFilters(filters),
              ],
            },
          },
          aggs: {
            // Page loads without a load event are counted but left out of the percentile.
            loadTime: p75Of(NAVIGATION_TIMING_LOAD_EVENT_END),
            loadTimeSamples: countOf(NAVIGATION_TIMING_LOAD_EVENT_END),
            // The counts of the trend sum to the page loads, and both charts share its buckets.
            trend: {
              ...dateHistogram(start, end),
              aggs: { loadTime: p75Of(NAVIGATION_TIMING_LOAD_EVENT_END) },
            },
          },
        },
        jsErrors: eventCount(EVENT_EXCEPTION),
        lcp: webVital(CORE_WEB_VITAL.lcp),
        inp: webVital(CORE_WEB_VITAL.inp),
        cls: webVital(CORE_WEB_VITAL.cls),
        fcp: webVital(CORE_WEB_VITAL.fcp),
        ttfb: webVital(CORE_WEB_VITAL.ttfb),
      },
      documentFilters(filters)
    ),
    ...filterOptionsAggs(filters, environment),
  },
});

/** The HTTP requests of one application and the failed ones, from the traces. */
export const spansSearch = ({
  serviceName,
  start,
  end,
  environment,
  filters = {},
}: OverviewSearchParams): estypes.SearchRequest => ({
  ...otelSearchDefaults(OTEL_TRACES_INDEX),
  runtime_mappings: filterRuntimeMappings(),
  query: {
    bool: {
      filter: [
        ...browserDocuments(start, end),
        ...serviceDocuments(serviceName),
        ...httpRequestDocuments(),
      ],
    },
  },
  // Only the selected environment: the picker's environments come from the logs. The page filter
  // is not applied: a request's `url.full` is the URL requested, not the page it was made from.
  aggs: {
    inEnvironment: {
      filter: inEnvironmentFilter(environment, documentFilters(filters)),
      aggs: {
        requests: requestsWithOutcome(),
        failed: failedRequests(),
      },
    },
  },
});
