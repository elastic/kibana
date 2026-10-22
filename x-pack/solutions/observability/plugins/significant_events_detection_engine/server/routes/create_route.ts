/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, forbidden, internal, isBoom, notFound } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { getStatusCode } from '../lib/errors';
import type { DetectionEngineRouteResources } from './types';

const createPlainRoute = createServerRouteFactory<DetectionEngineRouteResources>();

function toBoom(statusCode: number | undefined, error: Error) {
  switch (statusCode) {
    case 400:
      return badRequest(error.message);
    case 403:
      return forbidden(error.message);
    case 404:
      return notFound(error.message);
    case 409:
      return conflict(error.message);
    default:
      return internal(error.message);
  }
}

/**
 * Routes of the engine. Errors from the engine, Elasticsearch and Significant Events all carry
 * a status code; it becomes the HTTP status, so the page and the scheduler's workflow see why.
 */
export const createRoute: CreateServerRouteFactory<DetectionEngineRouteResources, undefined> = ({
  handler,
  ...config
}) =>
  createPlainRoute({
    ...config,
    options: {
      ...config.options,
      tags: [...(config.options?.tags ?? []), 'oas-tag:significant_events'],
    },
    handler: (options) =>
      handler(options).catch((error) => {
        if (isBoom(error) || !(error instanceof Error)) {
          throw error;
        }
        const statusCode =
          error instanceof errors.ResponseError ? error.statusCode : getStatusCode(error);
        throw toBoom(statusCode, error);
      }),
  });

/**
 * Kibana closes a socket that sends nothing for `server.socketTimeout`, 120s by default, which
 * aborts the run through {@link abortSignalOf}. Runs can take longer than that, so the routes
 * that run the engine stay open as long as the scheduler's workflow timeout and the run lease.
 */
export const LONG_RUN_IDLE_SOCKET_MS = 5 * 60_000;

/** Aborts when the client goes away, so a closed page or a timed-out workflow stops the work. */
export function abortSignalOf(request: KibanaRequest): AbortSignal {
  const controller = new AbortController();
  request.events.aborted$.subscribe(() => controller.abort());
  return controller.signal;
}
