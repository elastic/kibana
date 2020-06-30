/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from 'kibana/server';
import { schema } from '@kbn/config-schema';

export function defineRoutes(core: CoreSetup) {
  const router = core.http.createRouter();
  router.put(
    {
      path: '/api/alerts_fixture/saved_object/{type}/{id}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          version: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const { type, id } = req.params;
      const { attributes, version, references } = req.body;
      const options = { version, references };

      const [{ savedObjects }] = await core.getStartServices();
      const savedObjectsWithAlerts = await savedObjects.getScopedClient(req, {
        includedHiddenTypes: ['alert'],
      });
      const result = await savedObjectsWithAlerts.update(type, id, attributes, options);
      return res.ok({ body: result });
    }
  );
}
