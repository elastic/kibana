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
  { spaces }: Partial<FixtureSetupDeps>
) {
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

  router.put(
    {
      path: '/api/alerts_fixture/swap_api_keys/from/{apiKeyFromId}/to/{apiKeyToId}',
      validate: {
        params: schema.object({
          apiKeyFromId: schema.string(),
          apiKeyToId: schema.string(),
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
      const { apiKeyFromId, apiKeyToId } = req.params;

      let namespace: string | undefined;
      if (spaces && req.body.spaceId) {
        namespace = spaces.spacesService.spaceIdToNamespace(req.body.spaceId);
      }
      const [{ savedObjects }, { encryptedSavedObjects }] = await core.getStartServices();
      const encryptedSavedObjectsWithAlerts = await encryptedSavedObjects.getClient({
        includedHiddenTypes: ['alert'],
      });
      const savedObjectsWithAlerts = await savedObjects.getScopedClient(req, {
        excludedWrappers: ['security', 'spaces'],
        includedHiddenTypes: ['alert'],
      });

      const [fromAlert, toAlert] = await Promise.all([
        encryptedSavedObjectsWithAlerts.getDecryptedAsInternalUser<RawAlert>(
          'alert',
          apiKeyFromId,
          {
            namespace,
          }
        ),
        savedObjectsWithAlerts.get<RawAlert>('alert', apiKeyToId, {
          namespace,
        }),
      ]);

      const result = await savedObjectsWithAlerts.update<RawAlert>(
        'alert',
        apiKeyToId,
        {
          ...toAlert.attributes,
          apiKey: fromAlert.attributes.apiKey,
          apiKeyOwner: fromAlert.attributes.apiKeyOwner,
        },
        {
          namespace,
        }
      );
      return res.ok({ body: result });
    }
  );
}
