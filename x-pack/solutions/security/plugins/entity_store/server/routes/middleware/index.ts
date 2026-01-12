/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { EntityStoreRequestHandlerContext } from '../../types';
import { featureFlagEnabledMiddleware } from './feature_flag_enabled';

export type Handler<P, Q, B, R> = (
  ctx: EntityStoreRequestHandlerContext,
  req: KibanaRequest<P, Q, B>,
  res: KibanaResponseFactory
) => Promise<R>;

export type Middleware = Handler<unknown, unknown, unknown, IKibanaResponse | undefined>;
type ReqHandler<P, Q, B> = Handler<P, Q, B, IKibanaResponse>;

const REGISTERED_MIDDLEWARES: readonly Middleware[] = [featureFlagEnabledMiddleware];

export function wrapMiddlewares<P, Q, B>(
  handler: ReqHandler<P, Q, B>,
  middlewares: readonly Middleware[] = REGISTERED_MIDDLEWARES
) {
  return async (
    ctx: EntityStoreRequestHandlerContext,
    req: KibanaRequest<P, Q, B>,
    res: KibanaResponseFactory
  ) => {
    for (const middleware of middlewares) {
      const middlewareRes = await middleware(ctx, req, res);
      if (middlewareRes) {
        return middlewareRes;
      }
    }
    return handler(ctx, req, res);
  };
}
