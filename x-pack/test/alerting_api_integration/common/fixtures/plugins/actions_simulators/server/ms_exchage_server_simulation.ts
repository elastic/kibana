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
} from 'kibana/server';

export function initPlugin(router: IRouter, path: string) {
  router.post(
    {
      path: `${path}/users/test@/sendMail`,
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

  /* `https://login.microsoftonline.com/${transport.tenantId}/oauth2/v2.0/token`,
      logger,
      {
        scope: GRAPH_API_OAUTH_SCOPE,
        clientId: transport.clientId,
        clientSecret: transport.clientSecret,
      },
      */
  router.post(
    {
      path: `${path}/1234567/oauth2/v2.0/token`,
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
}

function jsonResponse(
  res: KibanaResponseFactory,
  code: number,
  object: Record<string, unknown> = {}
) {
  return res.custom<Record<string, unknown>>({ body: object, statusCode: code });
}
