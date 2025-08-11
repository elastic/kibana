/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps a provided URL with the space ID if it is not the default space.
 *
 * Examples:
 * - `withSpaceUrl('/api/some_endpoint')` returns `/api/some_endpoint`
 * - `withSpaceUrl('/api/some_endpoint', 'default')` returns `/api/some_endpoint`
 * - `withSpaceUrl('/api/some_endpoint', 'my_space') returns `/s/my_space/api/some_endpoint`
 */
export function withSpaceUrl(url: string, spaceId = 'default'): string {
  return spaceId === 'default' ? url : `/s/${spaceId}${url}`;
}
