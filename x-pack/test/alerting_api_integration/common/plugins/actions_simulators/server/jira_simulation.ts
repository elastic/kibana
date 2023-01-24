/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';

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
      return jsonResponse(res, 204, {});
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
        fields: {
          created: '2020-04-27T14:17:45.490Z',
          updated: '2020-04-27T14:17:45.490Z',
          summary: 'title',
          description: 'description',
        },
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
        updated: '2020-04-27T14:17:45.490Z',
      });
    }
  );

  router.get(
    {
      path: `${path}/rest/capabilities`,
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
        capabilities: {},
      });
    }
  );

  router.get(
    {
      path: `${path}/rest/api/2/issue/createmeta`,
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
        projects: [
          {
            issuetypes: [
              {
                id: '10006',
                name: 'Task',
              },
              {
                id: '10007',
                name: 'Sub-task',
              },
            ],
          },
        ],
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
