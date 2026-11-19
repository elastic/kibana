/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME, SERVICE_NAME } from '@kbn/apm-types';
import { CORE_WEB_VITAL } from '../../../../common/core_web_vitals';
import { LAST_SEEN_AGGREGATION } from '../../../lib/helpers/aggregations';
import type { HistogramParams } from '../../../lib/helpers/time_series';
import { dateHistogram } from '../../../lib/helpers/time_series';
import {
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import {
  browserDocuments,
  byEnvironment,
  environmentTerms,
  eventCount,
  failedRequests,
  httpRequestDocuments,
  otelSearchDefaults,
  requestsWithOutcome,
  webVital,
} from '../../../lib/otel/queries';
import { MAX_APPLICATIONS_PER_SOURCE, MAX_ENVIRONMENTS_PER_APPLICATION } from '../constants';

export interface SearchParams {
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
  histogram: HistogramParams;
}

export interface SpansSearchParams extends SearchParams {
  /** The applications `logsSearch` found: read by name, and excluded from the spans-only ones. */
  serviceNames: string[];
}

/** Page loads, JS errors and web vitals per application, from the logs. */
export const logsSearch = ({
  start,
  end,
  environment,
  histogram,
}: SearchParams): estypes.SearchRequest => ({
  ...otelSearchDefaults(OTEL_LOGS_INDEX),
  query: {
    bool: {
      filter: [
        ...browserDocuments(start, end),
        // Only the events the metrics count.
        ...termsQuery(OTEL_EVENT_NAME, [EVENT_NAVIGATION_TIMING, EVENT_WEB_VITAL, EVENT_EXCEPTION]),
      ],
    },
  },
  aggs: byEnvironment(environment, {
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
      aggs: { histogram: dateHistogram({ start, end, histogram }) },
    },
  }),
});

const SPANS_METRICS = {
  ...environmentTerms(MAX_ENVIRONMENTS_PER_APPLICATION),
  lastSeen: LAST_SEEN_AGGREGATION,
  requests: requestsWithOutcome(),
  failed: failedRequests(),
};

/** The applications of the logs, by name. */
const inLogsApplications = (serviceNames: string[]) => ({
  terms: { field: SERVICE_NAME, size: serviceNames.length, include: serviceNames },
  aggs: SPANS_METRICS,
});

/**
 * The other applications, most requests first. Those whose spans have no outcome, so no request to
 * show, are left out; ordering by a sub-aggregation is approximate across shards.
 */
const spansOnlyApplications = (size: number, serviceNames: string[]) => ({
  terms: {
    field: SERVICE_NAME,
    size,
    order: { requests: 'desc' as const },
    ...(serviceNames.length > 0 && { exclude: serviceNames }),
  },
  aggs: {
    ...SPANS_METRICS,
    withRequests: {
      bucket_selector: {
        buckets_path: { requests: 'requests>_count' },
        script: 'params.requests > 0',
      },
    },
  },
});

/**
 * HTTP requests (client spans with a method) and the failed ones per application, from traces:
 * `inLogs` for the applications `logsSearch` found, and `spansOnly` for the others, which fill the
 * rest of the cap. Either is omitted when its size would be 0.
 */
export const spansSearch = ({
  start,
  end,
  environment,
  serviceNames,
}: SpansSearchParams): estypes.SearchRequest => {
  const spansOnlySize = MAX_APPLICATIONS_PER_SOURCE - serviceNames.length;
  return {
    ...otelSearchDefaults(OTEL_TRACES_INDEX),
    query: {
      bool: {
        filter: [...browserDocuments(start, end), ...httpRequestDocuments()],
      },
    },
    aggs: byEnvironment(environment, {
      ...(serviceNames.length > 0 && { inLogs: inLogsApplications(serviceNames) }),
      ...(spansOnlySize > 0 && { spansOnly: spansOnlyApplications(spansOnlySize, serviceNames) }),
    }),
  };
};
