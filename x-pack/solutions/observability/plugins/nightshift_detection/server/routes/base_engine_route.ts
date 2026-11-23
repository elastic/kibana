/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { IKibanaResponse, KibanaRequest } from '@kbn/core/server';
import type { RouteHandler } from '@kbn/core-di-server';
import { EngineHttpError } from '../lib/errors/engine_http_error';
import { getStatusCode } from '../lib/errors/get_status_code';
import type { EngineRouteContext } from './engine_route_context';

/**
 * Shared edge of the engine's routes: a 404 when Nightshift is not available, and failures turned
 * into responses. A failure that carries an HTTP status (engine errors, Boom errors from Core and
 * other plugins, Elasticsearch errors) keeps its status and message, so a caller sees the cause.
 * Anything else is rethrown for Core to answer with a 500.
 */
@injectable()
export abstract class BaseEngineRoute<TBody = unknown> implements RouteHandler {
  constructor(
    protected readonly ctx: EngineRouteContext,
    protected readonly request: KibanaRequest<unknown, unknown, TBody>
  ) {}

  /** The route's work. Runs only when the engine is available. */
  protected abstract execute(): Promise<IKibanaResponse>;

  /** Runs the route and turns its failures into responses. */
  public async handle(): Promise<IKibanaResponse> {
    try {
      if (!(await this.ctx.availability.isAvailable())) {
        throw new EngineHttpError('Nightshift detection is not available.', 404);
      }

      return await this.execute();
    } catch (error) {
      const statusCode = getStatusCode(error);

      if (error instanceof Error && statusCode !== undefined && statusCode >= 400) {
        return this.ctx.response.customError({ statusCode, body: { message: error.message } });
      }

      throw error;
    }
  }

  /** The space the request is made in. */
  protected getSpaceId(): string {
    return this.ctx.getSpaceId(this.request);
  }
}
