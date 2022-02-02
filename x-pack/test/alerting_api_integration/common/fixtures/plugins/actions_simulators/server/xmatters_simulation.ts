/* eslint-disable no-console */
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
} from 'kibana/server';

export function initPlugin(router: IRouter, path: string) {
  console.log('bubly1');
  router.post(
    {
      path,
      options: {
        authRequired: false,
      },
      validate: {
        body: schema.object({
          alertId: schema.string(),
          alertActionGroupName: schema.string(),
          ruleName: schema.maybe(schema.string()),
          date: schema.maybe(schema.string()),
          severity: schema.string(),
          spaceId: schema.maybe(schema.string()),
          tags: schema.maybe(schema.string()),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      console.log('bubly2');
      const { body } = req;
      const alertActionGroupName = body?.alertActionGroupName;
      console.log('bubly3');
      console.log(body);
      console.log(alertActionGroupName);
      switch (alertActionGroupName) {
        case 'respond-with-400':
          return jsonErrorResponse(res, 400, new Error(alertActionGroupName));
        case 'respond-with-429':
          return jsonErrorResponse(res, 429, new Error(alertActionGroupName));
        case 'respond-with-502':
          return jsonErrorResponse(res, 502, new Error(alertActionGroupName));
      }
      console.log('bubly4');
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
