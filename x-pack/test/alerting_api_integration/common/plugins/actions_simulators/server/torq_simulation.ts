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
        body: schema.object(
          {
            msg: schema.string(),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      if (!validateTorqToken(req)) {
        return jsonErrorResponse(res, 401, new Error('unauthorised'));
      }
      const { body } = req;
      const content = body?.msg;
      switch (content) {
        case 'respond-with-400':
          return jsonErrorResponse(res, 400, new Error(content));
        case 'respond-with-404':
          return jsonErrorResponse(res, 404, new Error(content));
        case 'respond-with-429':
          return jsonErrorResponse(res, 429, new Error(content));
        case 'respond-with-405':
          return jsonErrorResponse(res, 405, new Error(content));
        case 'respond-with-502':
          return jsonErrorResponse(res, 502, new Error(content));
      }
      return jsonResponse(res, 204, {
        status: 'success',
      });
    }
  );
}

function validateTorqToken(req: KibanaRequest<any, any, any, any>): boolean {
  return req.headers['x-torq-token'] === 'someRandomToken';
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
