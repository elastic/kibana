/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { KibanaRequest } from '@kbn/core/server';

/**
 * Extracts the space ID from the request.
 * Falls back to extracting from basePath if spaces plugin is not available.
 */
export const getSpaceIdFromRequest = (request: KibanaRequest): string => {
  // Try to extract from request URL path (space context is in the path as /s/{spaceId})
  const pathname = request.url?.pathname || '';
  const spaceMatch = pathname.match(/^\/s\/([a-z0-9_\-]+)/);

  if (spaceMatch && spaceMatch[1]) {
    return spaceMatch[1];
  }

  // Fallback to default space
  return DEFAULT_SPACE_ID;
};
