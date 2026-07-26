/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEPLOYMENT_STATS_API_PATH = 'internal/serverless_vectordb/deployment_stats';
export const API_KEY_API_PATH = 'internal/serverless_vectordb/api_key';

/** Name prefix used by the api_key route (server/routes/api_key.ts). */
export const ONBOARDING_KEY_NAME_PREFIX = 'vectordb-onboarding-';

// Both routes are unversioned internal routes, so no elastic-api-version header
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;
