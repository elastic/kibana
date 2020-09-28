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
import { RawAlert } from '../../../../../../../plugins/alerts/server/types';
import { TaskInstance } from '../../../../../../../plugins/task_manager/server';
import { FixtureSetupDeps, FixtureStartDeps } from './plugin';

export function defineRoutes(
  core: CoreSetup<FixtureStartDeps>,
  { spaces, security }: Partial<FixtureSetupDeps>
) {
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

      if (!security) {
        return res.ok({
          body: {},
        });
      }

      const [{ savedObjects }, { encryptedSavedObjects }] = await core.getStartServices();
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
        return res.internalError({});
      }

      // Create an API key using the new grant API - in this case the Kibana system user is creating the
      // API key for the user, instead of having the user create it themselves, which requires api_key
      // privileges
      const createAPIKeyResult = await security.authc.grantAPIKeyAsInternalUser(req, {
        name: `alert:migrated-to-7.10:${user.username}`,
        role_descriptors: {},
      });

      if (!createAPIKeyResult) {
        return res.internalError({});
      }

      const result = await savedObjectsWithAlerts.update<RawAlert>(
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
          apiKey: Buffer.from(`${createAPIKeyResult.id}:${createAPIKeyResult.api_key}`).toString(
            'base64'
          ),
          apiKeyOwner: user.username,
        },
        {
          namespace,
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
      const result = await savedObjectsWithAlerts.update(
        type,
        id,
        { ...savedAlert.attributes, ...attributes },
        options
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
      const result = await savedObjectsWithTasksAndAlerts.update<TaskInstance>(
        'task',
        alert.attributes.scheduledTaskId!,
        { runAt }
      );
      return res.ok({ body: result });
    }
  );
}
