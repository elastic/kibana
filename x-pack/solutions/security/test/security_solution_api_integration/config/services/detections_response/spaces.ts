/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID, getRouteUrlForSpace } from '@kbn/spaces-plugin/common';

// TODO: Refactor and move this code to the spaces plugin's common folder

/**
 * Returns a normalized space ID that can't be undefined.
 * The default space has an ID of 'default'.
 */
export function getSpaceId(spaceId?: string): string {
  return spaceId ? String(spaceId) : DEFAULT_SPACE_ID;
}

/**
 * Wraps a provided URL with the space ID if it is not the default space.
 *
 * Examples:
 * - `withSpaceUrl('/api/some_endpoint')` returns `/api/some_endpoint`
 * - `withSpaceUrl('/api/some_endpoint', 'default')` returns `/api/some_endpoint`
 * - `withSpaceUrl('/api/some_endpoint', 'my_space') returns `/s/my_space/api/some_endpoint`
 */
export function withSpaceUrl(routeUrl: string, spaceId?: string): string {
  return getRouteUrlForSpace(routeUrl, spaceId);
}
