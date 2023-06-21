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
  ResponseHeaders,
} from '@kbn/core/server';
import { internalSetSlackApiURL } from '@kbn/stack-connectors-plugin/common/slack_api/lib';
import { kbnTestConfig } from '@kbn/test';
import { schema } from '@kbn/config-schema';

export function initPlugin(router: IRouter, path: string) {
  const kibanaServer = kbnTestConfig.getUrlParts();
  internalSetSlackApiURL(
    `${kibanaServer.protocol}://${kibanaServer.hostname}:${kibanaServer.port}` + path
  );

  router.post(
    {
      path: `${path}/chat.postMessage`,
      options: {
        authRequired: false,
      },
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { text } = req.body;

      switch (text) {
        case 'invalid_payload':
          return jsonResponse(res, 400, {
            message: 'invalid_payload',
          });
        case 'status_500':
          return jsonResponse(res, 500, {
            message: 'simulated slack 500 response',
          });
        case 'rate_limit':
          return jsonResponse(
            res,
            429,
            {
              message: 'rate_limit',
            },
            { 'Content-Type': 'application/json', 'Retry-After': '1' }
          );
      }

      return jsonResponse(res, 200, {
        id: '123',
        key: 'CK-1',
        ok: true,
      });
    }
  );

  router.get(
    {
      path: `${path}/conversations.list`,
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
        key: 'CK-2',
        ok: true,
      });
    }
  );
}

function jsonResponse(
  res: KibanaResponseFactory,
  code: number,
  object: Record<string, unknown> = {},
  headers: ResponseHeaders = {}
) {
  return res.custom<Record<string, unknown>>({ body: object, statusCode: code, headers });
}
