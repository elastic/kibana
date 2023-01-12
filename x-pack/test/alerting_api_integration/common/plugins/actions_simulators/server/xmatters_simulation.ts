/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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
      path,
      options: {
        authRequired: false,
      },
      validate: {
        body: schema.object({
          signalId: schema.string(),
          alertActionGroupName: schema.string(),
          ruleName: schema.string(),
          date: schema.string(),
          severity: schema.string(),
          spaceId: schema.string(),
          tags: schema.maybe(schema.string()),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { body } = req;
      const alertActionGroupName = body?.alertActionGroupName;
      switch (alertActionGroupName) {
        case 'respond-with-400':
          return jsonErrorResponse(res, 400, new Error(alertActionGroupName));
        case 'respond-with-429':
          return jsonErrorResponse(res, 429, new Error(alertActionGroupName));
        case 'respond-with-502':
          return jsonErrorResponse(res, 502, new Error(alertActionGroupName));
      }
      return jsonResponse(res, 202, {
        status: 'success',
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

function jsonErrorResponse(res: KibanaResponseFactory, code: number, object: Error) {
  return res.custom<Error>({ body: object, statusCode: code });
}
