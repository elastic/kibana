/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, termsQuery } from '@kbn/es-query';
import { DURATION, HTTP_REQUEST_METHOD, OTEL_EVENT_NAME, URL_FULL } from '@kbn/apm-types';
import { TOP_ROWS } from '../../../../common/top_rows';
import {
  EVENT_RESOURCE_TIMING,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
  RENDER_BLOCKING_STATUS_BLOCKING,
  RESOURCE_TIMING_DURATION,
  RESOURCE_TIMING_INITIATOR_TYPE,
  RESOURCE_TIMING_RENDER_BLOCKING_STATUS,
  RESOURCE_TIMING_TRANSFER_SIZE,
} from '../../../../common/otel_data';
import { byP75Descending, p75Of, p95Of } from '../../../lib/helpers/aggregations';
import {
  applicationDocuments,
  byEnvironment,
  failedRequests,
  httpRequestDocuments,
  otelSearchDefaults,
  requestsWithOutcome,
} from '../../../lib/otel/queries';
import type { ApplicationSearchParams } from '../../application_tab_route';

/** Resource timings of `fetch` and `XMLHttpRequest` calls. */
const API_CALL_INITIATOR_TYPES = ['fetch', 'xmlhttprequest'];

/** The resources the Network tab lists, slowest first, for its table to page and filter. */
export const SLOWEST_RESOURCES_ROWS = 50;

const RESOURCES_SHARD_SIZE = 200;

// API calls are left out: the HTTP requests list them from the traces.
const listedResources = {
  bool: {
    filter: termQuery(OTEL_EVENT_NAME, EVENT_RESOURCE_TIMING),
    must_not: termsQuery(RESOURCE_TIMING_INITIATOR_TYPE, API_CALL_INITIATOR_TYPES),
  },
};

/** One application's slowest resources, and its environments with browser data. */
export const resourcesSearch = ({ environment, ...application }: ApplicationSearchParams) => {
  return {
    ...otelSearchDefaults(OTEL_LOGS_INDEX),
    query: {
      bool: {
        filter: applicationDocuments(application),
      },
    },
    aggs: byEnvironment(environment, {
      resources: {
        filter: listedResources,
        aggs: {
          urls: {
            terms: {
              field: URL_FULL,
              size: SLOWEST_RESOURCES_ROWS,
              // Approximate: shards prune URLs before their percentiles are merged. A larger
              // `shard_size` keeps more candidates per shard, for a little more latency.
              shard_size: RESOURCES_SHARD_SIZE,
              order: byP75Descending('duration'),
            },
            aggs: {
              duration: p75Of(RESOURCE_TIMING_DURATION),
              transferSize: p75Of(RESOURCE_TIMING_TRANSFER_SIZE),
              initiatorType: { terms: { field: RESOURCE_TIMING_INITIATOR_TYPE, size: 1 } },
              renderBlocking: {
                filter: {
                  bool: {
                    filter: termQuery(
                      RESOURCE_TIMING_RENDER_BLOCKING_STATUS,
                      RENDER_BLOCKING_STATUS_BLOCKING
                    ),
                  },
                },
              },
            },
          },
        },
      },
    }),
  };
};

/** One application's HTTP requests by URL and method, and its environments with client spans. */
export const httpRequestsSearch = ({ environment, ...application }: ApplicationSearchParams) => {
  return {
    ...otelSearchDefaults(OTEL_TRACES_INDEX),
    query: {
      bool: {
        filter: [...applicationDocuments(application), ...httpRequestDocuments()],
      },
    },
    aggs: byEnvironment(environment, {
      requests: {
        multi_terms: {
          terms: [{ field: URL_FULL }, { field: HTTP_REQUEST_METHOD }],
          size: TOP_ROWS,
          // Runs the percentiles only for the top rows, not for every URL and method.
          collect_mode: 'breadth_first' as const,
        },
        aggs: {
          withOutcome: requestsWithOutcome(),
          failed: failedRequests(),
          duration: p95Of(DURATION),
        },
      },
    }),
  };
};
