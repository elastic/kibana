/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';
import { ProxyArgs, Simulator } from './simulator';

export const resilientFailedResponse = {
  errors: {
    message: 'failed',
  },
};

export class ResilientSimulator extends Simulator {
  private readonly returnError: boolean;

  constructor({ returnError = false, proxy }: { returnError?: boolean; proxy?: ProxyArgs }) {
    super(proxy);

    this.returnError = returnError;
  }

  public async handler(
    request: http.IncomingMessage,
    response: http.ServerResponse,
    data: Record<string, unknown>
  ) {
    if (this.returnError) {
      return ResilientSimulator.sendErrorResponse(response);
    }
    return ResilientSimulator.sendResponse(request, response);
  }

  private static sendResponse(request: http.IncomingMessage, response: http.ServerResponse) {
    response.statusCode = 202;
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify(
        {
          id: '123',
          create_date: 1589391874472,
        },
        null,
        4
      )
    );
  }

  private static sendErrorResponse(response: http.ServerResponse) {
    response.statusCode = 422;
    response.setHeader('Content-Type', 'application/json;charset=UTF-8');
    response.end(JSON.stringify(resilientFailedResponse, null, 4));
  }
}

export function initPlugin(router: IRouter, path: string) {
  router.post(
    {
      path: `${path}/rest/orgs/201/incidents`,
      options: {
        authRequired: false,
      },
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return jsonResponse(res, 200, {
        id: '123',
        create_date: 1589391874472,
      });
    }
  );

  router.patch(
    {
      path: `${path}/rest/orgs/201/incidents/{id}`,
      options: {
        authRequired: false,
      },
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return jsonResponse(res, 200, {
        success: true,
      });
    }
  );

  router.get(
    {
      path: `${path}/rest/orgs/201/incidents/{id}`,
      options: {
        authRequired: false,
      },
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return jsonResponse(res, 200, {
        id: '123',
        create_date: 1589391874472,
        inc_last_modified_date: 1589391874472,
        name: 'title',
        description: 'description',
      });
    }
  );

  router.post(
    {
      path: `${path}/rest/api/2/issue/{id}/comment`,
      options: {
        authRequired: false,
      },
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return jsonResponse(res, 200, {
        id: '123',
        created: '2020-04-27T14:17:45.490Z',
      });
    }
  );
}

function jsonResponse(
  res: KibanaResponseFactory,
  code: number,
  object: Record<string, unknown> = {}
) {
  return res.custom<Record<string, unknown>>({ body: object, statusCode: code });
}
