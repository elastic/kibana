/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared synthetics API paths used by Scout specs and helpers.
 *
 * These mirror the constants in `@kbn/synthetics-plugin/common/constants`; we
 * duplicate them here so Scout API specs don't need to import across the
 * plugin public/server boundary.
 */
export const SYNTHETICS_API_URLS = {
  SYNTHETICS_ENABLEMENT: '/internal/synthetics/service/enablement',
  SYNTHETICS_MONITORS: '/api/synthetics/monitors',
  FILTERS: '/internal/synthetics/monitor/filters',
  SUGGESTIONS: '/internal/synthetics/suggestions',
  PRIVATE_LOCATIONS: '/api/synthetics/private_locations',
  DYNAMIC_SETTINGS: '/internal/synthetics/settings',
  SYNTHETICS_MONITORS_PROJECT_UPDATE: '/api/synthetics/project/{projectName}/monitors/_bulk_update',
} as const;

export const PUBLIC_API_VERSION = '2023-10-31';
export const INTERNAL_API_VERSION = '1';

/** Default headers for Synthetics *public* API requests (versioned). */
export const PUBLIC_API_HEADERS = {
  'elastic-api-version': PUBLIC_API_VERSION,
} as const;

/** Default headers shared with Kibana for internal/public API requests from Scout API specs. */
export const KIBANA_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export function mergeSyntheticsApiHeaders(
  authHeader: Record<string, string>,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    ...KIBANA_HEADERS,
    ...authHeader,
    ...extra,
  };
}
