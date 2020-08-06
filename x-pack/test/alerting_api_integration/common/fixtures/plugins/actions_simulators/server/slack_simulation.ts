/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  router.post(
    {
      path,
      options: {
        authRequired: false,
      },
      validate: {
        body: schema.object({
          text: schema.string(),
        }),
      },
    },
    // ServiceNow simulator: create a servicenow action pointing here, and you can get
    // different responses based on the message posted. See the README.md for
    // more info.
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const body = req.body;
      const text = body && body.text;

      if (text == null) {
        return res.badRequest({ body: 'bad request to slack simulator' });
      }

      switch (text) {
        case 'success':
          return res.ok({ body: 'ok' });

        case 'no_text':
          return res.badRequest({ body: 'no_text' });

        case 'invalid_payload':
          return res.badRequest({ body: 'invalid_payload' });

        case 'invalid_token':
          return res.forbidden({ body: 'invalid_token' });

        case 'status_500':
          return res.internalError({ body: 'simulated slack 500 response' });

        case 'rate_limit':
          const response = {
            retry_after: 1,
            ok: false,
            error: 'rate_limited',
          };

          return res.custom({
            body: Buffer.from('ok'),
            statusCode: 429,
            headers: {
              'retry-after': '1',
            },
          });
      }

      return res.badRequest({ body: 'unknown request to slack simulator' });
    }
  );
}
