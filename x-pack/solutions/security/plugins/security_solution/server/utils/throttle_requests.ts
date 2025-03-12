/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { MaybePromise } from '@kbn/utility-types';
import type { SecuritySolutionRequestHandlerContext } from '../types';

type RouteHandlerParams = [
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest,
  response: KibanaResponseFactory
];

interface ThrottleOptions {
  spaceAware?: boolean;
}

/**
 * Throttles requests to ensure that only one request is processed at a time.
 * Concurrent requests will be deduplicated and will share the same response.
 *
 * Optionally, it can be space-aware, meaning it will throttle requests based on
 * the space ID.
 *
 * Note: This function is not suitable for routes that accept parameters in the
 * request body. It might also lead to high memory usage in case of big response
 * payloads and many concurrent requests.
 *
 * @param routeHandler - The route handler function to be throttled.
 * @param options - Throttle options.
 * @param options.spaceAware - If true, throttles requests based on the space
 * ID.
 * @returns A throttled version of the route handler.
 */
export const throttleRequests = (
  routeHandler: (...params: RouteHandlerParams) => MaybePromise<IKibanaResponse>,
  { spaceAware = false }: ThrottleOptions = {}
) => {
  const runningRequests = new Map<string, MaybePromise<IKibanaResponse>>();

  return async (...params: RouteHandlerParams) => {
    const spaceId = spaceAware ? (await params[0].securitySolution).getSpaceId() : 'default';

    let currentRequest = runningRequests.get(spaceId);
    if (!currentRequest) {
      // There is no running request for this space, so we can start a new one
      currentRequest = routeHandler(...params);
      runningRequests.set(spaceId, currentRequest);
    }

    try {
      return await currentRequest;
    } finally {
      runningRequests.delete(spaceId);
    }
  };
};
