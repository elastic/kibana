/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DEFAULT_SPACE_ID = 'default';

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
export function withSpaceUrl(url: string, spaceId = DEFAULT_SPACE_ID): string {
  const normalizedSpaceId = getSpaceId(spaceId);
  return normalizedSpaceId === DEFAULT_SPACE_ID ? url : `/s/${spaceId}${url}`;
}
