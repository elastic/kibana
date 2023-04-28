/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import http from 'http';

// export async function initPlugin() {
//   return http.createServer(async (request, response) => {
//     let body = null;
//     if (request.method === 'POST') {
//       const data = [];
//       for await (const chunk of request) {
//         data.push(chunk);
//       }
//       body = JSON.parse(data.join(''));
//     }

//     console.log(`Slack api simulator received call`, {
//       method: request.method,
//       url: request.url,
//       body,
//     });

//     response.writeHead(401, { 'Content-Type': 'text/plain' });
//     response.end('Not supported http method to request slack simulator');
//   });
// }

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
import { internalSetSlackApiURL } from '@kbn/stack-connectors-plugin/common/slack_api/lib';
import { kbnTestConfig } from '@kbn/test';

export function initPlugin(router: IRouter, path: string) {
  const kibanaServer = kbnTestConfig.getUrlParts();
  internalSetSlackApiURL(
    `${kibanaServer.protocol}://${kibanaServer.hostname}:${kibanaServer.port}` + path
  );
  console.log(
    'SLACK API SIM SET UP WITH PATH',
    path,
    `${kibanaServer.protocol}://${kibanaServer.hostname}:${kibanaServer.port}` + path
  );
  router.post(
    {
      path: `${path}/chat.postMessage`,
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
        key: 'CK-1',
        ok: true,
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
