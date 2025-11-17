/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/spaces-plugin/common';

/**
 * Gets the space ID from the request path.
 * Falls back to 'default' if no space ID is found in the path.
 */
export const getSpaceIdFromRequest = (request: KibanaRequest): string => {
  const pathname = request.url.pathname;
  const { spaceId } = getSpaceIdFromPath(pathname);
  return spaceId ?? DEFAULT_SPACE_ID;
};

