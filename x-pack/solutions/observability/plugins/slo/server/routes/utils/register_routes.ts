/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { isBoom } from '@hapi/boom';
import type { CoreSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RouteRegistrar,
  VersionedRouteRegistrar,
} from '@kbn/core-http-server';
import { isKibanaResponse } from '@kbn/core-http-server';
import type {
  DefaultRouteCreateOptions,
  ServerRoute,
  ZodParamsObject,
} from '@kbn/server-route-repository';
import {
  makeZodValidationObject,
  noParamsValidationObject,
  parseEndpoint,
  stripNullishRequestParameters,
} from '@kbn/server-route-repository';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream } from '@kbn/sse-utils-server';
import { isZod } from '@kbn/zod';
import { merge, omit } from 'lodash';
import type { Observable } from 'rxjs';
import { isObservable } from 'rxjs';
import type { SLORoutesDependencies } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: Record<string, ServerRoute<string, any, any, any, any>>;
  logger: Logger;
  dependencies: SLORoutesDependencies;
  isDev: boolean;
}

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: {
    message: 'Client closed request',
  },
};

/**
 * Registers the SLO routes like `registerRoutes` from `@kbn/server-route-repository`, but builds
 * the request validation on the first request instead of at setup.
 */
export function registerServerRoutes({ repository, core, logger, dependencies }: RegisterRoutes) {
  const router = core.http.createRouter();

  Object.values(repository).forEach((route) => {
    const { endpoint, handler, security } = route;
    const params: ZodParamsObject | undefined = 'params' in route ? route.params : undefined;
    const options: DefaultRouteCreateOptions = 'options' in route ? route.options : {};
    const { method, pathname, version } = parseEndpoint(endpoint);

    const wrappedHandler = async (
      context: RequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ) => {
      try {
        // Already validated by Core against the zod params schema.
        const validatedParams =
          params === undefined
            ? undefined
            : stripNullishRequestParameters({
                params: request.params,
                body: request.body,
                query: request.query,
              });

        const { aborted, result } = await Promise.race([
          handler({
            request,
            response,
            context,
            params: validatedParams,
            logger,
            ...dependencies,
          }).then((value) => {
            return {
              aborted: false,
              result: value,
            };
          }),
          request.events.aborted$.toPromise().then(() => {
            return {
              aborted: true,
              result: undefined,
            };
          }),
        ]);

        if (aborted) {
          return response.custom(CLIENT_CLOSED_REQUEST);
        }

        if (isKibanaResponse(result)) {
          if (result.status >= 500) {
            logger.error(() => `HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
          } else if (result.status >= 400) {
            logger.debug(() => `HTTP ${result.status}: ${JSON.stringify(result.payload)}`);
          }

          return result;
        } else if (isObservable(result)) {
          const controller = new AbortController();
          request.events.aborted$.subscribe(() => {
            controller.abort();
          });
          return response.ok({
            body: observableIntoEventSourceStream(result as Observable<ServerSentEvent>, {
              logger,
              signal: controller.signal,
            }),
          });
        } else {
          const body = result || {};
          return response.ok({ body });
        }
      } catch (error) {
        const opts = {
          statusCode: 500,
          body: {
            message: error.message,
            attributes: {
              data: {},
            },
          } as {
            message: string | undefined;
            attributes: {
              data: unknown;
              caused_by?: Array<{ message: string | undefined }>;
            };
          },
        };

        if (error instanceof errors.RequestAbortedError) {
          return response.custom(merge(opts, CLIENT_CLOSED_REQUEST));
        }

        if (isBoom(error)) {
          opts.statusCode = error.output.statusCode;
          opts.body.attributes.data = error?.data;
        }

        if (error instanceof AggregateError) {
          opts.body.attributes.caused_by = error.errors.map((innerError) => {
            return { message: innerError.message };
          });
        }

        if (opts.statusCode >= 500) {
          logger.error(() => error);
        } else {
          logger.debug(() => error);
        }

        return response.custom(opts);
      }
    };

    logger.debug(`Registering endpoint ${endpoint}`);

    // A thunk, so that registering the routes does not materialize the lazy `@kbn/slo-schema`
    // params schemas (`isZod` and `makeZodValidationObject` both read them). Core builds the
    // validation once on the first request (eagerly in dev mode) and caches it.
    const makeValidate = () => {
      if (params === undefined) {
        return noParamsValidationObject;
      }
      if (!isZod(params)) {
        throw new Error(`Route ${endpoint} has non-zod params, which are not supported.`);
      }
      return makeZodValidationObject(params);
    };

    const access = options?.access ?? (pathname.startsWith('/internal/') ? 'internal' : 'public');

    if (!version) {
      (router[method] as RouteRegistrar<typeof method, RequestHandlerContext>)(
        {
          path: pathname,
          options: {
            ...options,
            access,
          },
          security,
          validate: makeValidate,
        },
        wrappedHandler
      );
    } else {
      (router.versioned[method] as VersionedRouteRegistrar<typeof method, RequestHandlerContext>)({
        path: pathname,
        access,
        summary: options.summary,
        description: options.description,
        options: omit(options, 'access', 'description', 'summary', 'deprecated', 'discontinued'),
        security,
      }).addVersion(
        {
          version,
          options,
          validate: () => ({ request: makeValidate() }),
        },
        wrappedHandler
      );
    }
  });
}
