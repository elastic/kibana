/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { type RequestHandler } from '@kbn/core/server';
import type { InfraPluginRequestHandlerContext } from '../types';

export function handleRouteErrors<Params = any, Query = any, Body = any>(
  handler: RequestHandler<Params, Query, Body, InfraPluginRequestHandlerContext>
): RequestHandler<Params, Query, Body, InfraPluginRequestHandlerContext> {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (err) {
      if (Boom.isBoom(err)) {
        return response.customError({
          statusCode: err.output.statusCode,
          body: { message: err.output.payload.message },
        });
      }

      return response.customError({
        statusCode: err.statusCode ?? 500,
        body: {
          message: err.message ?? 'An unexpected error occurred',
        },
      });
    }
  };
}
