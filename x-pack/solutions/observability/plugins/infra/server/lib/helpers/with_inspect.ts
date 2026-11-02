/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import type { InspectResponse } from '@kbn/observability-shared-plugin/common';

export const inspectableEsQueriesMap = new WeakMap<KibanaRequest, InspectResponse>();

export function withInspect<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  TContext extends RequestHandlerContext = RequestHandlerContext
>(
  handler: (
    context: TContext,
    request: KibanaRequest<TParams, TQuery, TBody>
  ) => Promise<Record<string, any>>
) {
  return async (
    context: TContext,
    request: KibanaRequest<TParams, TQuery, TBody>,
    response: KibanaResponseFactory
  ) => {
    inspectableEsQueriesMap.set(request, []);
    const inspectEnabled = (request.query as Record<string, any>)?._inspect === true;

    try {
      const data = await handler(context, request);

      return response.ok({
        body: inspectEnabled ? { ...data, _inspect: inspectableEsQueriesMap.get(request) } : data,
      });
    } catch (err: any) {
      const statusCode = Boom.isBoom(err) ? err.output.statusCode : err.statusCode ?? 500;
      const message = Boom.isBoom(err)
        ? err.output.payload.message
        : err.message ?? 'An unexpected error occurred';

      return response.customError({
        statusCode,
        body: {
          message,
          attributes: { _inspect: inspectableEsQueriesMap.get(request) },
        },
      });
    } finally {
      inspectableEsQueriesMap.delete(request);
    }
  };
}
