/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { notFound } from '@hapi/boom';
import type { CoreSetup } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { makeZodValidationObject, noParamsValidationObject } from '@kbn/server-route-repository';
import { lazySchema, z } from '@kbn/zod';
import * as t from 'io-ts';
import { NEVER, of } from 'rxjs';
import { registerServerRoutes } from './register_routes';
import type { SLORoutesDependencies } from './types';

jest.mock('@kbn/server-route-repository', () => {
  const actual = jest.requireActual('@kbn/server-route-repository');
  return { ...actual, makeZodValidationObject: jest.fn(actual.makeZodValidationObject) };
});

const makeZodValidationObjectMock = makeZodValidationObject as jest.MockedFunction<
  typeof makeZodValidationObject
>;

const security = { authz: { enabled: false as const, reason: 'test' } };

describe('registerServerRoutes', () => {
  const post = jest.fn();
  const addVersion = jest.fn();
  const versionedPost = jest.fn(() => ({ addVersion }));
  const createRouter = jest.fn().mockReturnValue({ post, versioned: { post: versionedPost } });
  const core = { http: { createRouter } } as unknown as CoreSetup;
  const logger = loggerMock.create();
  const dependencies = { aDependency: 'value' } as unknown as SLORoutesDependencies;
  const mockContext = {};
  const mockRequest = { events: { aborted$: NEVER } };

  const paramsFactory = jest.fn(() =>
    z.object({
      path: z.object({ id: z.string() }),
      query: z.object({ instanceId: z.string().optional() }),
      body: z.object({ name: z.string() }).optional(),
    })
  );
  const lazyParams = lazySchema(paramsFactory);

  const register = (routes: Parameters<typeof registerServerRoutes>[0]['repository']) =>
    registerServerRoutes({ core, logger, dependencies, repository: routes, isDev: false });

  const registerUnversioned = (route: Record<string, unknown>) => {
    register({
      'POST /internal/observability/slos/{id}': {
        endpoint: 'POST /internal/observability/slos/{id}',
        security,
        handler: jest.fn(),
        ...route,
      },
    });
    const [config, wrappedHandler] = post.mock.calls[0];
    return { config, wrappedHandler };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validation', () => {
    it('defers building the zod validation to the first call of validate', () => {
      const { config } = registerUnversioned({ params: lazyParams });

      expect(typeof config.validate).toBe('function');
      expect(paramsFactory).not.toHaveBeenCalled();
      expect(makeZodValidationObjectMock).not.toHaveBeenCalled();
    });

    it('builds the validation object from the params schema', () => {
      const { config } = registerUnversioned({ params: lazyParams });

      const validation = config.validate();

      expect(makeZodValidationObjectMock).toHaveBeenCalledTimes(1);
      expect(makeZodValidationObjectMock).toHaveBeenCalledWith(lazyParams);
      expect(validation).toBe(makeZodValidationObjectMock.mock.results[0].value);
      expect(validation.params.safeParse({ id: 'slo-id' }).success).toBe(true);
      expect(validation.params.safeParse({ id: 'slo-id', extra: true }).success).toBe(false);
    });

    it('passes a lazy request validation to versioned routes', () => {
      register({
        'POST /api/observability/slos/{id} 2023-10-31': {
          endpoint: 'POST /api/observability/slos/{id} 2023-10-31',
          security,
          params: lazyParams,
          handler: jest.fn(),
        },
      });

      expect(versionedPost).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/api/observability/slos/{id}', access: 'public' })
      );
      const [{ version, validate }] = addVersion.mock.calls[0];
      expect(version).toBe('2023-10-31');
      expect(typeof validate).toBe('function');
      expect(paramsFactory).not.toHaveBeenCalled();

      expect(validate()).toEqual({ request: makeZodValidationObjectMock.mock.results[0].value });
      expect(makeZodValidationObjectMock).toHaveBeenCalledWith(lazyParams);
    });

    it('uses the no-params validation object when the route has no params', () => {
      const { config } = registerUnversioned({});

      expect(config.options).toEqual({ access: 'internal' });
      expect(config.validate()).toBe(noParamsValidationObject);
      expect(makeZodValidationObjectMock).not.toHaveBeenCalled();
    });

    it('throws when building the validation of non-zod params', () => {
      const { config } = registerUnversioned({
        params: t.type({ path: t.type({ id: t.string }) }),
      });

      expect(() => config.validate()).toThrow(
        'Route POST /internal/observability/slos/{id} has non-zod params, which are not supported.'
      );
    });
  });

  describe('handler', () => {
    it('calls the route handler with the dependencies and the stripped request params', async () => {
      const handler = jest.fn().mockResolvedValue({ id: 'slo-id' });
      const { wrappedHandler } = registerUnversioned({ params: lazyParams, handler });

      const response = await wrappedHandler(
        mockContext,
        { ...mockRequest, params: { id: 'slo-id' }, query: {}, body: null },
        kibanaResponseFactory
      );

      expect(handler).toHaveBeenCalledTimes(1);
      const [args] = handler.mock.calls[0];
      expect(Object.keys(args).sort()).toEqual(
        ['aDependency', 'context', 'logger', 'params', 'request', 'response'].sort()
      );
      expect(args.params).toEqual({ path: { id: 'slo-id' } });
      expect(args.context).toBe(mockContext);
      expect(args.logger).toBe(logger);
      expect(response).toEqual({
        status: 200,
        payload: { id: 'slo-id' },
        options: { body: { id: 'slo-id' } },
      });
    });

    it('passes undefined params when the route has no params', async () => {
      const handler = jest.fn();
      const { wrappedHandler } = registerUnversioned({ handler });

      await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(handler.mock.calls[0][0].params).toBeUndefined();
    });

    it('returns a KibanaResponse from the handler as is', async () => {
      const customResponse = kibanaResponseFactory.custom({ statusCode: 201, body: { ok: true } });
      const { wrappedHandler } = registerUnversioned({
        handler: jest.fn().mockResolvedValue(customResponse),
      });

      const response = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response).toBe(customResponse);
    });

    it('maps a Boom error to its status code', async () => {
      const { wrappedHandler } = registerUnversioned({
        handler: jest.fn().mockRejectedValue(notFound('SLO not found')),
      });

      const response = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response).toEqual({
        status: 404,
        payload: { message: 'SLO not found', attributes: { data: null } },
        options: {},
      });
    });

    it('maps an unknown error to a 500', async () => {
      const { wrappedHandler } = registerUnversioned({
        handler: jest.fn().mockRejectedValue(new Error('boom')),
      });

      const response = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response).toEqual({
        status: 500,
        payload: { message: 'boom', attributes: { data: {} } },
        options: {},
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('maps an aborted Elasticsearch request to a 499', async () => {
      const { wrappedHandler } = registerUnversioned({
        handler: jest.fn().mockRejectedValue(new errors.RequestAbortedError('aborted')),
      });

      const response = await wrappedHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(499);
      expect(response.payload.message).toBe('Client closed request');
    });

    it('responds with a 499 when the client closes the request', async () => {
      const { wrappedHandler } = registerUnversioned({
        handler: jest.fn().mockReturnValue(new Promise(() => {})),
      });

      const response = await wrappedHandler(
        mockContext,
        { events: { aborted$: of(undefined) } },
        kibanaResponseFactory
      );

      expect(response).toEqual({
        status: 499,
        payload: { message: 'Client closed request' },
        options: {},
      });
    });
  });
});
