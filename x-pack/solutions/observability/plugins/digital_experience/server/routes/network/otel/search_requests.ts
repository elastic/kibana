/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
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
import { environmentFilter } from '../../../lib/helpers/environment';
import {
  ENVIRONMENT_FIELDS,
  applicationDocuments,
  byEnvironment,
  failedRequests,
  httpRequestDocuments,
  otelSearchDefaults,
  requestsWithOutcome,
} from '../../../lib/otel/queries';
import type { ApplicationSearchParams } from '../../application_tab_route';

/** Resource timings of `fetch` and `XMLHttpRequest` calls, which the traces hold as spans too. */
const API_CALL_INITIATOR_TYPES = ['fetch', 'xmlhttprequest'];

/** The resources the Network tab lists, slowest first, for its table to page and filter. */
export const SLOWEST_RESOURCES_ROWS = 50;

/**
 * The slowest resources of one application, and every environment for the picker, leaving out API
 * calls since the HTTP requests list them from the traces.
 */
export const resourcesSearch = ({
  environment,
  ...application
}: ApplicationSearchParams): estypes.SearchRequest => {
  return {
    ...otelSearchDefaults(OTEL_LOGS_INDEX),
    query: {
      bool: {
        filter: [
          ...applicationDocuments(application),
          ...termQuery(OTEL_EVENT_NAME, EVENT_RESOURCE_TIMING),
        ],
        must_not: termsQuery(RESOURCE_TIMING_INITIATOR_TYPE, API_CALL_INITIATOR_TYPES),
      },
    },
    aggs: byEnvironment(environment, {
      urls: {
        terms: {
          field: URL_FULL,
          size: SLOWEST_RESOURCES_ROWS,
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
    }),
  };
};

/** The HTTP requests of one application by URL and method, from the client spans. */
export const httpRequestsSearch = ({
  environment,
  ...application
}: ApplicationSearchParams): estypes.SearchRequest => {
  return {
    ...otelSearchDefaults(OTEL_TRACES_INDEX),
    query: {
      bool: {
        filter: [...applicationDocuments(application), ...httpRequestDocuments()],
      },
    },
    // Only the selected environment: the picker's environments come from the logs.
    aggs: {
      inEnvironment: {
        filter: environmentFilter(ENVIRONMENT_FIELDS, environment),
        aggs: {
          requests: {
            multi_terms: {
              terms: [{ field: URL_FULL }, { field: HTTP_REQUEST_METHOD }],
              size: TOP_ROWS,
            },
            aggs: {
              withOutcome: requestsWithOutcome(),
              failed: failedRequests(),
              duration: p95Of(DURATION),
            },
          },
        },
      },
    },
  };
};
