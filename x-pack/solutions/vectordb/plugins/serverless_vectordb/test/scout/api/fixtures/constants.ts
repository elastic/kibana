/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEPLOYMENT_STATS_API_PATH = 'internal/serverless_vectordb/deployment_stats';
export const API_KEY_API_PATH = 'internal/serverless_vectordb/api_key';
export const STARRED_DASHBOARDS_COUNT_API_PATH =
  'internal/serverless_vectordb/starred_dashboards_count';

/** Mirrors `ONBOARDING_KEY_NAME_PREFIX` in `server/routes/api_key.ts`. */
export const ONBOARDING_KEY_NAME_PREFIX = 'vectordb-onboarding-';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;
