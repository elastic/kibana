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
        body: schema.object(
          {
            dedup_key: schema.string(),
            payload: schema.object(
              {
                summary: schema.string(),
              },
              {
                unknowns: 'allow',
              }
            ),
          },
          {
            unknowns: 'allow',
          }
        ),
      },
    },
    // Pagerduty simulator: create an action pointing here, and you can get
    // different responses based on the message posted. See the README.md for
    // more info.
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { body } = req;
      let dedupKey = body && body.dedup_key;
      const summary = body && body.payload && body.payload.summary;

      if (dedupKey == null) {
        dedupKey = `kibana-ft-simulator-dedup-key-${new Date().toISOString()}`;
      }

      switch (summary) {
        case 'respond-with-429':
          return jsonErrorResponse(res, 429, new Error(summary));
        case 'respond-with-502':
          return jsonErrorResponse(res, 502, new Error(summary));
        case 'respond-with-418':
          return jsonErrorResponse(res, 418, new Error(summary));
      }

      return jsonResponse(res, 202, {
        status: 'success',
        message: 'Event processed',
        dedup_key: dedupKey,
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
