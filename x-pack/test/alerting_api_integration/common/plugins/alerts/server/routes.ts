/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  Logger,
  SavedObject,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { InvalidatePendingApiKey } from '@kbn/alerting-plugin/server/types';
import { RawRule } from '@kbn/alerting-plugin/server/types';
import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { queryOptionsSchema } from '@kbn/event-log-plugin/server/event_log_client';
import { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { ActionExecutionSourceType } from '@kbn/actions-plugin/server/types';
import { FixtureStartDeps } from './plugin';
import { retryIfConflicts } from './lib/retry_if_conflicts';

export function defineRoutes(
  core: CoreSetup<FixtureStartDeps>,
  taskManagerStart: Promise<TaskManagerStartContract>,
  notificationsStart: Promise<NotificationsPluginStart>,
  { logger }: { logger: Logger }
) {
  const router = core.http.createRouter();
  router.get(
    {
      path: '/api/alerts_fixture/registered_rule_types',
      validate: {},
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      try {
        const [_, { alerting }] = await core.getStartServices();
        return res.ok({
          body: alerting.getAllTypes(),
        });
      } catch (err) {
        return res.badRequest({ body: err });
      }
    }
  );
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

      const [{ savedObjects }, { encryptedSavedObjects, security, spaces }] =
        await core.getStartServices();
      if (!security) {
        return res.ok({
          body: {},
        });
      }

      const encryptedSavedObjectsWithAlerts = await encryptedSavedObjects.getClient({
        includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
      });
      const savedObjectsWithAlerts = await savedObjects.getScopedClient(req, {
        // Exclude the security and spaces wrappers to get around the safeguards those have in place to prevent
        // us from doing what we want to do - brute force replace the ApiKey
        excludedExtensions: [SECURITY_EXTENSION_ID, SPACES_EXTENSION_ID],
        includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
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
          return await savedObjectsWithAlerts.update<RawRule>(
            RULE_SAVED_OBJECT_TYPE,
            id,
            {
              ...(
                await encryptedSavedObjectsWithAlerts.getDecryptedAsInternalUser<RawRule>(
                  RULE_SAVED_OBJECT_TYPE,
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
        includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
      });
      const savedAlert = await savedObjectsWithAlerts.get<RawRule>(type, id);
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
      path: '/api/alerts_fixture/{taskId}/reschedule_task',
      validate: {
        params: schema.object({
          taskId: schema.string(),
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
      const { taskId } = req.params;
      const { runAt } = req.body;

      const [{ savedObjects }] = await core.getStartServices();
      const savedObjectsWithTasksAndAlerts = await savedObjects.getScopedClient(req, {
        includedHiddenTypes: ['task', RULE_SAVED_OBJECT_TYPE],
      });
      const result = await retryIfConflicts(
        logger,
        `/api/alerts_fixture/${taskId}/reschedule_task`,
        async () => {
          return await savedObjectsWithTasksAndAlerts.update<TaskInstance>('task', taskId, {
            runAt,
          });
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
        includedHiddenTypes: ['task', RULE_SAVED_OBJECT_TYPE],
      });
      const alert = await savedObjectsWithTasksAndAlerts.get<RawRule>(RULE_SAVED_OBJECT_TYPE, id);
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

  router.post(
    {
      path: '/api/alerts_fixture/{id}/bulk_enqueue_actions',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      try {
        const [, { actions, security, spaces }] = await core.getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(req);

        const createAPIKeyResult =
          security &&
          (await security.authc.apiKeys.grantAsInternalUser(req, {
            name: `alerts_fixture:bulk_enqueue_actions:${uuidv4()}`,
            role_descriptors: {},
          }));

        await actionsClient.bulkEnqueueExecution([
          {
            id: req.params.id,
            spaceId: spaces ? spaces.spacesService.getSpaceId(req) : 'default',
            executionId: uuidv4(),
            apiKey: createAPIKeyResult
              ? Buffer.from(`${createAPIKeyResult.id}:${createAPIKeyResult.api_key}`).toString(
                  'base64'
                )
              : null,
            params: req.body.params,
            actionTypeId: req.params.id,
          },
        ]);
        return res.noContent();
      } catch (err) {
        if (err.isBoom && err.output.statusCode === 403) {
          return res.forbidden({ body: err });
        }

        return res.badRequest({ body: err });
      }
    }
  );

  router.post(
    {
      path: `/api/alerting_actions_telemetry/run_soon`,
      validate: {
        body: schema.object({
          taskId: schema.string({
            validate: (telemetryTaskId: string) => {
              if (
                ['Alerting-alerting_telemetry', 'Actions-actions_telemetry'].includes(
                  telemetryTaskId
                )
              ) {
                return;
              }
              return 'invalid telemetry task id';
            },
          }),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { taskId } = req.body;
      try {
        const taskManager = await taskManagerStart;
        return res.ok({ body: await taskManager.runSoon(taskId) });
      } catch (err) {
        return res.ok({ body: { id: taskId, error: `${err}` } });
      }
    }
  );

  router.get(
    {
      path: '/api/alerts_fixture/rule/{id}/_get_api_key',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { id } = req.params;
      const [, { encryptedSavedObjects, spaces }] = await core.getStartServices();

      const spaceId = spaces ? spaces.spacesService.getSpaceId(req) : 'default';

      let namespace: string | undefined;
      if (spaces && spaceId) {
        namespace = spaces.spacesService.spaceIdToNamespace(spaceId);
      }

      try {
        const {
          attributes: { apiKey, apiKeyOwner },
        }: SavedObject<RawRule> = await encryptedSavedObjects
          .getClient({
            includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
          })
          .getDecryptedAsInternalUser(RULE_SAVED_OBJECT_TYPE, id, {
            namespace,
          });

        return res.ok({ body: { apiKey, apiKeyOwner } });
      } catch (err) {
        return res.badRequest({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/alerts_fixture/registered_connector_types',
      validate: {},
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      try {
        const [_, { actions }] = await core.getStartServices();
        return res.ok({
          body: actions.getAllTypes(),
        });
      } catch (e) {
        return res.badRequest({ body: e });
      }
    }
  );

  router.get(
    {
      path: '/_test/event_log/{type}/{id}/_find',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.string(),
        }),
        query: queryOptionsSchema,
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const [, { eventLog }] = await core.getStartServices();
      const eventLogClient = eventLog.getClient(req);
      const {
        params: { id, type },
        query,
      } = req;

      try {
        return res.ok({
          body: await eventLogClient.findEventsBySavedObjectIds(type, [id], query),
        });
      } catch (err) {
        return res.notFound();
      }
    }
  );

  router.post(
    {
      path: '/_test/send_notification',
      validate: {
        body: schema.object({
          to: schema.arrayOf(schema.string()),
          subject: schema.string(),
          message: schema.string(),
          messageHTML: schema.maybe(schema.string()),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const notifications = await notificationsStart;
      const { to, subject, message, messageHTML } = req.body;

      if (!notifications.isEmailServiceAvailable()) {
        return res.ok({ body: { error: 'notifications are not available' } });
      }

      const emailService = notifications.getEmailService();

      emailService.sendPlainTextEmail({ to, subject, message });
      emailService.sendHTMLEmail({ to, subject, message, messageHTML });

      return res.ok({ body: { ok: true } });
    }
  );

  router.post(
    {
      path: '/api/alerts_fixture/{id}/_execute_connector',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          params: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> => {
      const [_, { actions }] = await core.getStartServices();

      const actionsClient = await actions.getActionsClientWithRequest(req);

      try {
        return res.ok({
          body: await actionsClient.execute({
            actionId: req.params.id,
            params: req.body.params,
            source: {
              type: ActionExecutionSourceType.HTTP_REQUEST,
              source: req,
            },
            relatedSavedObjects: [],
          }),
        });
      } catch (err) {
        if (err.isBoom && err.output.statusCode === 403) {
          return res.forbidden({ body: err });
        }

        throw err;
      }
    }
  );
}
