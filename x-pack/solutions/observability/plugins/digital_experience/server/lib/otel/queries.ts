/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { dateRangeQuery, termQuery } from '@kbn/es-query';
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
import type { CoreWebVital } from '../../../common/core_web_vitals';
import { MAX_ENVIRONMENTS } from '../constants';
import { environmentFilter, environmentNotDefinedFilter } from '../helpers/environment';
import { vitalStatsAggs } from '../helpers/web_vitals';
import {
  BROWSER_SDK_LANGUAGE,
  EVENT_WEB_VITAL,
  SPAN_KIND_CLIENT,
  SPAN_STATUS_ERROR,
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
} from '../../../common/otel_data';

/**
 * `service.environment` aliases the deprecated `deployment.environment`, which newer SDKs replace
 * with `deployment.environment.name`.
 */
export const ENVIRONMENT_FIELDS = [
  SERVICE_ENVIRONMENT,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
];

/** The browser SDK documents of the time range, for every application. */
export const browserDocuments = (start: number, end: number) => [
  ...dateRangeQuery(start, end),
  // Browser SDKs only: the OTel indices also hold backend services (java, nodejs, python…).
  ...termQuery(TELEMETRY_SDK_LANGUAGE, BROWSER_SDK_LANGUAGE),
];

/** The documents of one application, by its exact name. */
export const serviceDocuments = (serviceName: string) => termQuery(SERVICE_NAME, serviceName);

/** A filter aggregation counting the documents of one event, e.g. the page loads. */
export const eventCount = (eventName: string) => ({
  filter: { bool: { filter: termQuery(OTEL_EVENT_NAME, eventName) } },
});

/** Terms aggregations over both environment fields, for the picker. */
export const environmentTerms = (size: number) => ({
  environments: { terms: { field: SERVICE_ENVIRONMENT, size } },
  environmentNames: { terms: { field: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME, size } },
});

/** The settings of an aggregations-only search of `index`. */
export const otelSearchDefaults = (index: string) => ({
  index,
  size: 0,
  track_total_hits: false,
  // Missing OTel indices are empty data, not a failure.
  ignore_unavailable: true,
  // A shard that fails fails the search, so a failure is never shown as lower or zero metrics.
  allow_partial_search_results: false,
});

/** Up to 100 environments for the picker, whatever the selected one, and `aggs` in that one. */
export const byEnvironment = (
  environment: string | undefined,
  aggs: Record<string, estypes.AggregationsAggregationContainer>
) => ({
  ...environmentTerms(MAX_ENVIRONMENTS),
  environmentNotDefined: { filter: environmentNotDefinedFilter(ENVIRONMENT_FIELDS) },
  inEnvironment: { filter: environmentFilter(ENVIRONMENT_FIELDS, environment), aggs },
});

/** One vital's samples (the filter's doc count) and stats, matching `cls` and `CLS` alike. */
export const webVital = (vital: CoreWebVital) => ({
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

/** The HTTP requests the browser made: client spans with a method. */
export const httpRequestDocuments = () => [
  ...termQuery(KIND, SPAN_KIND_CLIENT),
  { exists: { field: HTTP_REQUEST_METHOD } },
];

// A request without a response (e.g. a network error) has no status code but an error span status.
const requestWithoutResponse = termQuery(STATUS_CODE, SPAN_STATUS_ERROR);

/** Requests with a known outcome: a response status, or none because the request failed. */
export const requestsWithOutcome = () => ({
  filter: {
    bool: {
      should: [{ exists: { field: HTTP_RESPONSE_STATUS_CODE } }, ...requestWithoutResponse],
      minimum_should_match: 1,
    },
  },
});

/** Failed requests: an HTTP error status (4xx or 5xx), or no response. */
export const failedRequests = () => ({
  filter: {
    bool: {
      should: [{ range: { [HTTP_RESPONSE_STATUS_CODE]: { gte: 400 } } }, ...requestWithoutResponse],
      minimum_should_match: 1,
    },
  },
});
