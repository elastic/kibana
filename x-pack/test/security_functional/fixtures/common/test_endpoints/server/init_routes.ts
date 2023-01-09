/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { errors } from '@elastic/elasticsearch';
import { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import { PluginStartDependencies } from '.';

export const SESSION_INDEX_CLEANUP_TASK_NAME = 'session_cleanup';

export function initRoutes(
  initializerContext: PluginInitializerContext,
  core: CoreSetup<PluginStartDependencies>
) {
  const logger = initializerContext.logger.get();

  const authenticationAppOptions = { simulateUnauthorized: false };
  core.http.resources.register(
    {
      path: '/authentication/app',
      validate: false,
    },
    async (context, request, response) => {
      if (authenticationAppOptions.simulateUnauthorized) {
        return response.unauthorized();
      }
      return response.renderCoreApp();
    }
  );

  const router = core.http.createRouter();
  router.post(
    {
      path: '/authentication/app/setup',
      validate: { body: schema.object({ simulateUnauthorized: schema.boolean() }) },
      options: { authRequired: false, xsrfRequired: false },
    },
    (context, request, response) => {
      authenticationAppOptions.simulateUnauthorized = request.body.simulateUnauthorized;
      return response.ok();
    }
  );

  router.post(
    {
      path: '/authentication/slow/me',
      validate: {
        body: schema.object({
          duration: schema.duration(),
          client: schema.oneOf([
            schema.literal('request-context'),
            schema.literal('start-contract'),
            schema.literal('custom'),
          ]),
        }),
      },
      options: { xsrfRequired: false },
    },
    async (context, request, response) => {
      const slowLog = logger.get('slow/me');
      slowLog.info(`Received request ${JSON.stringify(request.body)}.`);

      let scopedClient;
      if (request.body.client === 'start-contract') {
        scopedClient = (await core.getStartServices())[0].elasticsearch.client.asScoped(request);
      } else if (request.body.client === 'request-context') {
        scopedClient = (await context.core).elasticsearch.client;
      } else {
        scopedClient = (await core.getStartServices())[0].elasticsearch
          .createClient('custom')
          .asScoped(request);
      }

      await scopedClient.asCurrentUser.security.authenticate();
      slowLog.info(
        `Performed initial authentication request, waiting (${request.body.duration.asSeconds()}s)...`
      );

      // 2. Wait specified amount of time.
      await new Promise((resolve) => setTimeout(resolve, request.body.duration.asMilliseconds()));
      slowLog.info(`Waiting is done, performing final authentication request.`);

      // 3. Make authentication request once again and return result.
      try {
        const body = await scopedClient.asCurrentUser.security.authenticate();
        slowLog.info(
          `Successfully performed final authentication request: ${JSON.stringify(body)}`
        );
        return response.ok({ body });
      } catch (err) {
        slowLog.error(
          `Failed to perform final authentication request: ${
            err instanceof errors.ResponseError ? JSON.stringify(err.body) : err.message
          }`
        );

        throw err;
      }
    }
  );

  router.post(
    {
      path: '/session/toggle_cleanup_task',
      validate: { body: schema.object({ enabled: schema.boolean() }) },
    },
    async (context, request, response) => {
      const [, { taskManager }] = await core.getStartServices();
      logger.info(`Toggle session cleanup task (enabled: ${request.body.enabled}).`);
      try {
        if (request.body.enabled) {
          await taskManager.bulkEnable([SESSION_INDEX_CLEANUP_TASK_NAME]);
        } else {
          await taskManager.bulkDisable([SESSION_INDEX_CLEANUP_TASK_NAME]);
        }
      } catch (err) {
        logger.error(
          `Failed to toggle session cleanup task (enabled: ${request.body.enabled}): ${
            err?.message || err
          }.`
        );
        throw err;
      }

      logger.info(`Successfully toggled session cleanup task (enabled: ${request.body.enabled}).`);

      if (request.body.enabled) {
        try {
          await taskManager.runSoon(SESSION_INDEX_CLEANUP_TASK_NAME);
          logger.info('Successfully triggered session cleanup task.');
        } catch (err) {
          // Running can fail since Task Manager could have already picked up the task, so swallow error as it's not
          // critical for the test anyway.
          logger.error(`Could not run the session cleanup task: ${err.message || err}`);
        }
      }

      return response.ok();
    }
  );
}
