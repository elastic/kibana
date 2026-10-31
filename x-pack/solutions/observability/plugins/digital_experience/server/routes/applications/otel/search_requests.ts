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
import { dateHistogram } from '../../../lib/helpers/time_series';
import { environmentFilter } from '../../../lib/helpers/environment';
import {
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import {
  ENVIRONMENT_FIELDS,
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
}

export interface SpansSearchParams extends SearchParams {
  /** The applications `logsSearch` found, so both searches cover the same ones. */
  serviceNames: string[];
}

/** Page loads, JS errors and web vitals per application, from the logs. */
export const logsSearch = ({ start, end, environment }: SearchParams): estypes.SearchRequest => ({
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
      aggs: { histogram: dateHistogram(start, end) },
    },
  }),
});

/** HTTP requests (client spans with a method) and the failed ones per application, from traces. */
export const spansSearch = ({
  start,
  end,
  environment,
  serviceNames,
}: SpansSearchParams): estypes.SearchRequest => ({
  ...otelSearchDefaults(OTEL_TRACES_INDEX),
  query: {
    bool: {
      filter: [...browserDocuments(start, end), ...httpRequestDocuments()],
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
            requests: requestsWithOutcome(),
            failed: failedRequests(),
          },
        },
      },
    },
  },
});
