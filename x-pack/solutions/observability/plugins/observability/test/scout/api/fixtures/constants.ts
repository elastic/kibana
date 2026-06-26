/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANNOTATIONS_INDEX_NAME = 'observability-annotations';

export const ANNOTATIONS_API_PATH = '/api/observability/annotation';

export const ALERT_DETAILS_CONTEXT_API_PATH =
  'internal/observability/assistant/alert_details_contextual_insights';

/**
 * Internal Observability routes registered via `@kbn/server-route-repository`
 * without an explicit version are non-versioned, so no `elastic-api-version`
 * header is required — only the internal-origin and xsrf headers.
 */
export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
};

/**
 * The annotation routes are `access: 'public'` and delegate authorization to
 * Elasticsearch, so only the xsrf header is needed alongside the credentials.
 */
export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'scout',
};
