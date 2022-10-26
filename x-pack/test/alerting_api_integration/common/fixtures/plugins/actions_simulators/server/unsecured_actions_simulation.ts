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
}
