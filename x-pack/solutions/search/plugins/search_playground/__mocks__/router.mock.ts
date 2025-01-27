/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  KibanaRequest,
  RequestHandlerContext,
  RouteValidatorConfig,
} from '@kbn/core/server';
import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';

/**
 * Test helper that mocks Kibana's router and DRYs out various helper (callRoute, schema validation)
 */

type MethodType = 'get' | 'post' | 'put' | 'patch' | 'delete';
type PayloadType = 'params' | 'query' | 'body';

interface IMockRouter {
  method: MethodType;
  path: string;
  context?: jest.Mocked<RequestHandlerContext>;
}
interface IMockRouterRequest {
  body?: object;
  query?: object;
  params?: object;
}
type MockRouterRequest = KibanaRequest | IMockRouterRequest;

export class MockRouter {
  public router!: jest.Mocked<IRouter>;
  public method: MethodType;
  public path: string;
  public context: jest.Mocked<RequestHandlerContext>;
  public payload?: PayloadType;
  public response = httpServerMock.createResponseFactory();

  constructor({ method, path, context = {} as jest.Mocked<RequestHandlerContext> }: IMockRouter) {
    this.createRouter();
    this.method = method;
    this.path = path;
    this.context = context;
  }

  public createRouter = () => {
    this.router = httpServiceMock.createRouter();
  };

  public callRoute = async (request: MockRouterRequest) => {
    const route = this.findRouteRegistration();
    const [, handler] = route;
    await handler(this.context, httpServerMock.createKibanaRequest(request as any), this.response);
  };

  /**
   * Schema validation helpers
   */

  public validateRoute = (request: MockRouterRequest) => {
    const route = this.findRouteRegistration();
    const [config] = route;
    const validate = config.validate as RouteValidatorConfig<{}, {}, {}>;
    const payloads = Object.keys(request) as PayloadType[];

    payloads.forEach((payload: PayloadType) => {
      const payloadValidation = validate[payload] as { validate(request: KibanaRequest): void };
      const payloadRequest = request[payload] as KibanaRequest;

      payloadValidation.validate(payloadRequest);
    });
  };

  public shouldValidate = (request: MockRouterRequest) => {
    expect(() => this.validateRoute(request)).not.toThrow();
  };

  public shouldThrow = (request: MockRouterRequest) => {
    expect(() => this.validateRoute(request)).toThrow();
  };

  private findRouteRegistration = () => {
    const routerCalls = this.router[this.method].mock.calls as any[];
    if (!routerCalls.length) throw new Error('No routes registered.');

    const route = routerCalls.find(([router]: any) => router.path === this.path);
    if (!route) throw new Error('No matching registered routes found - check method/path keys');

    return route;
  };
}
