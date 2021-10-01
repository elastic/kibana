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
  router.post(
    {
      path: `${path}/api/now/v2/table/incident`,
      options: {
        authRequired: false,
      },
      validate: {
        body: schema.object({
          short_description: schema.string(),
          description: schema.maybe(schema.string()),
          comments: schema.maybe(schema.string()),
          caller_id: schema.string(),
          severity: schema.string({ defaultValue: '1' }),
          urgency: schema.string({ defaultValue: '1' }),
          impact: schema.string({ defaultValue: '1' }),
          category: schema.maybe(schema.string()),
          subcategory: schema.maybe(schema.string()),
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
      return jsonResponse(res, 200, {
        result: { sys_id: '123', number: 'INC01', sys_created_on: '2020-03-10 12:24:20' },
      });
    }
  );

  router.patch(
    {
      path: `${path}/api/now/v2/table/incident/{id}`,
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
        result: { sys_id: '123', number: 'INC01', sys_updated_on: '2020-03-10 12:24:20' },
      });
    }
  );

  router.get(
    {
      path: `${path}/api/now/v2/table/incident/{id}`,
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
        result: {
          sys_id: '123',
          number: 'INC01',
          sys_created_on: '2020-03-10 12:24:20',
          short_description: 'title',
          description: 'description',
        },
      });
    }
  );

  router.get(
    {
      path: `${path}/api/now/v2/table/sys_dictionary`,
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
        result: [
          {
            column_label: 'Close notes',
            mandatory: 'false',
            max_length: '4000',
            element: 'close_notes',
          },
          {
            column_label: 'Description',
            mandatory: 'false',
            max_length: '4000',
            element: 'description',
          },
          {
            column_label: 'Short description',
            mandatory: 'false',
            max_length: '160',
            element: 'short_description',
          },
        ],
      });
    }
  );

  router.get(
    {
      path: `${path}/api/now/v2/table/sys_choice`,
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
        result: [
          {
            dependent_value: '',
            label: '1 - Critical',
            value: '1',
          },
          {
            dependent_value: '',
            label: '2 - High',
            value: '2',
          },
          {
            dependent_value: '',
            label: '3 - Moderate',
            value: '3',
          },
          {
            dependent_value: '',
            label: '4 - Low',
            value: '4',
          },
          {
            dependent_value: '',
            label: '5 - Planning',
            value: '5',
          },
        ],
      });
    }
  );
}

function jsonResponse(res: KibanaResponseFactory, code: number, object?: Record<string, unknown>) {
  if (object == null) {
    return res.custom({
      statusCode: code,
      body: '',
    });
  }

  return res.custom<Record<string, unknown>>({ body: object, statusCode: code });
}
