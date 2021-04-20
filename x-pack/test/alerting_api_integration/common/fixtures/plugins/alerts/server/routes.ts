/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  Logger,
} from 'kibana/server';
import { schema } from '@kbn/config-schema';
import { InvalidatePendingApiKey } from '../../../../../../../plugins/alerting/server/types';
import { RawAlert } from '../../../../../../../plugins/alerting/server/types';
import {
  ConcreteTaskInstance,
  TaskInstance,
} from '../../../../../../../plugins/task_manager/server';
import { FixtureStartDeps } from './plugin';
import { retryIfConflicts } from './lib/retry_if_conflicts';

export function defineRoutes(core: CoreSetup<FixtureStartDeps>, { logger }: { logger: Logger }) {
  const router = core.http.createRouter();
  router.put(
    {
      path: '/api/alerts_fixture/{id}/replace_api_key',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          spaceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const { id } = req.params;

      const [
        { savedObjects },
        { encryptedSavedObjects, security, spaces },
      ] = await core.getStartServices();
      if (!security) {
        return res.ok({
          body: {},
        });
      }

      const encryptedSavedObjectsWithAlerts = await encryptedSavedObjects.getClient({
        includedHiddenTypes: ['alert'],
      });
      const savedObjectsWithAlerts = await savedObjects.getScopedClient(req, {
        // Exclude the security and spaces wrappers to get around the safeguards those have in place to prevent
        // us from doing what we want to do - brute force replace the ApiKey
        excludedWrappers: ['security', 'spaces'],
        includedHiddenTypes: ['alert'],
      });

      let namespace: string | undefined;
      if (spaces && req.body.spaceId) {
        namespace = spaces.spacesService.spaceIdToNamespace(req.body.spaceId);
      }

      const user = await security.authc.getCurrentUser(req);
      if (!user) {
        throw new Error('Failed to get the current user');
      }

      // Create an API key using the new grant API - in this case the Kibana system user is creating the
      // API key for the user, instead of having the user create it themselves, which requires api_key
      // privileges
      const createAPIKeyResult = await security.authc.apiKeys.grantAsInternalUser(req, {
        name: `alert:migrated-to-7.10:${user.username}`,
        role_descriptors: {},
      });

      if (!createAPIKeyResult) {
        throw new Error('Failed to grant an API Key');
      }

      const result = await retryIfConflicts(
        logger,
        `/api/alerts_fixture/${id}/replace_api_key`,
        async () => {
          return await savedObjectsWithAlerts.update<RawAlert>(
            'alert',
            id,
            {
              ...(
                await encryptedSavedObjectsWithAlerts.getDecryptedAsInternalUser<RawAlert>(
                  'alert',
                  id,
                  {
                    namespace,
                  }
                )
              ).attributes,
              apiKey: Buffer.from(
                `${createAPIKeyResult.id}:${createAPIKeyResult.api_key}`
              ).toString('base64'),
              apiKeyOwner: user.username,
            },
            {
              namespace,
            }
          );
        }
      );

      return res.ok({ body: result });
    }
  );

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
      const savedAlert = await savedObjectsWithAlerts.get<RawAlert>(type, id);
      const result = await retryIfConflicts(
        logger,
        `/api/alerts_fixture/saved_object/${type}/${id}`,
        async () => {
          return await savedObjectsWithAlerts.update(
            type,
            id,
            { ...savedAlert.attributes, ...attributes },
            options
          );
        }
      );
      return res.ok({ body: result });
    }
  );

  router.put(
    {
      path: '/api/alerts_fixture/{id}/reschedule_task',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          runAt: schema.string(),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const { id } = req.params;
      const { runAt } = req.body;

      const [{ savedObjects }] = await core.getStartServices();
      const savedObjectsWithTasksAndAlerts = await savedObjects.getScopedClient(req, {
        includedHiddenTypes: ['task', 'alert'],
      });
      const alert = await savedObjectsWithTasksAndAlerts.get<RawAlert>('alert', id);
      const result = await retryIfConflicts(
        logger,
        `/api/alerts_fixture/${id}/reschedule_task`,
        async () => {
          return await savedObjectsWithTasksAndAlerts.update<TaskInstance>(
            'task',
            alert.attributes.scheduledTaskId!,
            { runAt }
          );
        }
      );
      return res.ok({ body: result });
    }
  );

  router.put(
    {
      path: '/api/alerts_fixture/{id}/reset_task_status',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          status: schema.string(),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const { id } = req.params;
      const { status } = req.body;

      const [{ savedObjects }] = await core.getStartServices();
      const savedObjectsWithTasksAndAlerts = await savedObjects.getScopedClient(req, {
        includedHiddenTypes: ['task', 'alert'],
      });
      const alert = await savedObjectsWithTasksAndAlerts.get<RawAlert>('alert', id);
      const result = await retryIfConflicts(
        logger,
        `/api/alerts_fixture/{id}/reset_task_status`,
        async () => {
          return await savedObjectsWithTasksAndAlerts.update<ConcreteTaskInstance>(
            'task',
            alert.attributes.scheduledTaskId!,
            { status }
          );
        }
      );
      return res.ok({ body: result });
    }
  );

  router.get(
    {
      path: '/api/alerts_fixture/api_keys_pending_invalidation',
      validate: {},
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      try {
        const [{ savedObjects }] = await core.getStartServices();
        const savedObjectsWithTasksAndAlerts = await savedObjects.getScopedClient(req, {
          includedHiddenTypes: ['api_key_pending_invalidation'],
        });
        const findResult = await savedObjectsWithTasksAndAlerts.find<InvalidatePendingApiKey>({
          type: 'api_key_pending_invalidation',
        });
        return res.ok({
          body: { apiKeysToInvalidate: findResult.saved_objects },
        });
      } catch (err) {
        return res.badRequest({ body: err });
      }
    }
  );
}
