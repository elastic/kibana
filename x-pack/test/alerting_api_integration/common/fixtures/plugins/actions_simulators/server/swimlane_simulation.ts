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
      path: `${path}/api/app/{id}/record`,
      options: {
        authRequired: false,
      },
      validate: {},
    },
    // Swimlane simulator: create an action pointing here, and you can get
    // different responses based on the message posted. See the README.md for
    // more info.
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return jsonResponse(res, 200, {
        id: 'wowzeronza',
        name: 'ET-69',
      });
    }
  );
  router.patch(
    {
      path: `${path}/api/app/{id}/record/{recordId}`,
      options: {
        authRequired: false,
      },
      validate: {},
    },
    // Swimlane simulator: create an action pointing here, and you can get
    // different responses based on the message posted. See the README.md for
    // more info.
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      return jsonResponse(res, 200, {
        id: 'wowzeronza',
        name: 'ET-69',
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
