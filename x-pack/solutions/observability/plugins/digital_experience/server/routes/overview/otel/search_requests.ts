/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME } from '@kbn/apm-types';
import { CORE_WEB_VITAL } from '../../../../common/core_web_vitals';
import { countOf, p75Of } from '../../../lib/helpers/aggregations';
import { dateHistogram } from '../../../lib/helpers/time_series';
import { environmentFilter } from '../../../lib/helpers/environment';
import {
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  NAVIGATION_TIMING_LOAD_EVENT_END,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import {
  ENVIRONMENT_FIELDS,
  browserDocuments,
  byEnvironment,
  eventCount,
  failedRequests,
  httpRequestDocuments,
  otelSearchDefaults,
  requestsWithOutcome,
  serviceDocuments,
  webVital,
} from '../../../lib/otel/queries';

export interface OverviewSearchParams {
  serviceName: string;
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
}

/**
 * Page loads, load time, JS errors, web vitals and the trend of one application, from the logs.
 *
 * Page loads count the navigation-timing events only, so soft navigations (`browser.navigation`)
 * and resource timings (`browser.resource_timing`), which carry timing attributes of their own, are
 * left out.
 */
export const logsSearch = ({
  serviceName,
  start,
  end,
  environment,
}: OverviewSearchParams): estypes.SearchRequest => ({
  ...otelSearchDefaults(OTEL_LOGS_INDEX),
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
  aggs: byEnvironment(environment, {
    pageLoads: {
      ...eventCount(EVENT_NAVIGATION_TIMING),
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
  }),
});

/** The HTTP requests of one application and the failed ones, from the traces. */
export const spansSearch = ({
  serviceName,
  start,
  end,
  environment,
}: OverviewSearchParams): estypes.SearchRequest => ({
  ...otelSearchDefaults(OTEL_TRACES_INDEX),
  query: {
    bool: {
      filter: [
        ...browserDocuments(start, end),
        ...serviceDocuments(serviceName),
        ...httpRequestDocuments(),
      ],
    },
  },
  // Only the selected environment: the picker's environments come from the logs.
  aggs: {
    inEnvironment: {
      filter: environmentFilter(ENVIRONMENT_FIELDS, environment),
      aggs: {
        requests: requestsWithOutcome(),
        failed: failedRequests(),
      },
    },
  },
});
