/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';
import { FixtureStartDeps } from './plugin';

export function initPlugin(router: IRouter, coreSetup: CoreSetup<FixtureStartDeps>) {
  router.post(
    {
      path: `/api/sample_unsecured_action`,
      validate: {
        body: schema.object({
          requesterId: schema.string(),
          id: schema.string(),
          params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const [_, { actions }] = await coreSetup.getStartServices();
      const { body } = req;

      try {
        const unsecuredActionsClient = actions.getUnsecuredActionsClient();
        const { requesterId, id, params } = body;
        await unsecuredActionsClient.bulkEnqueueExecution(requesterId, [{ id, params }]);

        return res.ok({ body: { status: 'success' } });
      } catch (err) {
        return res.ok({ body: { status: 'error', error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: `/api/execute_unsecured_action`,
      validate: {
        body: schema.object({
          requesterId: schema.string(),
          id: schema.string(),
          spaceId: schema.string(),
          params: schema.recordOf(schema.string(), schema.any()),
          relatedSavedObjects: schema.maybe(
            schema.arrayOf(
              schema.object({
                id: schema.string(),
                type: schema.string(),
                typeId: schema.maybe(schema.string()),
              })
            )
          ),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const [_, { actions }] = await coreSetup.getStartServices();
      const { body } = req;

      try {
        const unsecuredActionsClient = actions.getUnsecuredActionsClient();
        const { requesterId, spaceId, id, params, relatedSavedObjects } = body;
        const result = await unsecuredActionsClient.execute({
          requesterId,
          id,
          params,
          spaceId,
          relatedSavedObjects,
        });

        return res.ok({ body: { status: 'success', result } });
      } catch (err) {
        return res.ok({ body: { status: 'error', error: `${err}` } });
      }
    }
  );

  router.post(
    {
      path: `/api/get_all_unsecured_actions`,
      validate: {
        body: schema.object({
          spaceId: schema.string(),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const [_, { actions }] = await coreSetup.getStartServices();
      const { body } = req;

      try {
        const unsecuredActionsClient = actions.getUnsecuredActionsClient();
        const { spaceId } = body;
        const result = await unsecuredActionsClient.getAll(spaceId);

        return res.ok({ body: { status: 'success', result } });
      } catch (err) {
        return res.ok({ body: { status: 'error', error: `${err}` } });
      }
    }
  );
}
