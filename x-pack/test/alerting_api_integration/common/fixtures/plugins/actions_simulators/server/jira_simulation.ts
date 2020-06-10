/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from 'kibana/server';

export function initPlugin(router: IRouter, path: string) {
  router.post(
    {
      path: `${path}/rest/api/2/issue`,
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
        key: 'CK-1',
        created: '2020-04-27T14:17:45.490Z',
      });
    }
  );

  router.put(
    {
      path: `${path}/rest/api/2/issue/{id}`,
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
        key: 'CK-1',
        created: '2020-04-27T14:17:45.490Z',
        updated: '2020-04-27T14:17:45.490Z',
      });
    }
  );

  router.get(
    {
      path: `${path}/rest/api/2/issue/{id}`,
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
        key: 'CK-1',
        created: '2020-04-27T14:17:45.490Z',
        updated: '2020-04-27T14:17:45.490Z',
        summary: 'title',
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
