/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteMethod,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { PLAYGROUND_ENABLED_SETTING_ID } from '../../common';
import { errorHandler } from './error_handler';

type PlaygroundRequestHandlerWrapper = <
  P,
  Q,
  B,
  Context extends RequestHandlerContext = RequestHandlerContext,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
>(
  handler: RequestHandler<P, Q, B, Context, Method, ResponseFactory>
) => RequestHandler<P, Q, B, Context, Method, ResponseFactory>;

/**
 * Gates a Playground route on the `searchPlayground:enabled` advanced setting; while it is off the route 404s as if it did not exist.
 */
export const withPlaygroundEnabled: PlaygroundRequestHandlerWrapper =
  (handler) => async (context, request, response) => {
    const { uiSettings } = await context.core;
    const isEnabled = await uiSettings.client.get<boolean>(PLAYGROUND_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(context, request, response);
  };

/**
 * Wraps a Playground route handler with the standard error handling and the `searchPlayground:enabled` gate.
 */
export const createPlaygroundRouteHandler =
  (logger: Logger): PlaygroundRequestHandlerWrapper =>
  (handler) =>
    errorHandler(logger)(withPlaygroundEnabled(handler));
