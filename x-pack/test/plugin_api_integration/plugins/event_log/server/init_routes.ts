/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
  Logger,
  RouteValidationResultFactory,
} from '@kbn/core/server';
import { IEventLogService, IEventLogger } from '@kbn/event-log-plugin/server';
import { IValidatedEvent } from '@kbn/event-log-plugin/server/types';

export const logEventRoute = (router: IRouter, eventLogger: IEventLogger, logger: Logger) => {
  router.post(
    {
      path: `/api/log_event_fixture/{id}/_log`,
      validate: {
        // removed validation as schema is currently broken in tests
        // blocked by: https://github.com/elastic/kibana/issues/61652
        params: (value: any, { ok }: RouteValidationResultFactory) => ok(value),
        body: (value: any, { ok }: RouteValidationResultFactory) => ok(value),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { id } = req.params as { id: string };
      const event: IValidatedEvent = req.body;
      const soClient = (await context.core).savedObjects.client;
      logger.info(`test fixture: log event: ${id} ${JSON.stringify(event)}`);
      try {
        await soClient.get('event_log_test', id);
        logger.info(`found existing saved object`);
      } catch (ex) {
        logger.info(`log event error: ${ex}`);
        await soClient.create('event_log_test', {}, { id });
        logger.info(`created saved object ${id}`);
      }
      // mark now as start and end
      eventLogger.startTiming(event);
      eventLogger.stopTiming(event);
      eventLogger.logEvent(event);
      logger.info(`logged`);
      return res.ok({});
    }
  );
};

export const registerProviderActionsRoute = (
  router: IRouter,
  eventLogService: IEventLogService,
  logger: Logger
) => {
  router.post(
    {
      path: '/api/log_event_fixture/{provider}/_registerProviderActions',
      validate: {
        body: (value) => ({ value }),
        params: (value: any, { ok }: RouteValidationResultFactory) => ok(value),
      },
      options: { authRequired: false },
    },
    (context, request, response) => {
      const { provider } = request.params as { provider: string };
      const actions = request.body;
      try {
        logger.info(
          `test register provider actions: ${provider}, actions: ${JSON.stringify(actions)}`
        );

        eventLogService.registerProviderActions(provider, actions);
        logger.info(`registered`);
      } catch (e) {
        return response.badRequest({ body: e });
      }
      return response.ok({ body: {} });
    }
  );
};

export const isProviderActionRegisteredRoute = (
  router: IRouter,
  eventLogService: IEventLogService,
  logger: Logger
) => {
  router.get(
    {
      path: `/api/log_event_fixture/{provider}/{action}/_isProviderActionRegistered`,
      validate: {
        params: (value: any, { ok }: RouteValidationResultFactory) => ok(value),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { provider, action } = req.params as { provider: string; action: string };
      logger.info(`test provider actions is registered: ${provider} for action: ${action}`);

      return res.ok({
        body: {
          isProviderActionRegistered: eventLogService.isProviderActionRegistered(provider, action),
        },
      });
    }
  );
};

export const getProviderActionsRoute = (
  router: IRouter,
  eventLogService: IEventLogService,
  logger: Logger
) => {
  router.get(
    {
      path: `/api/log_event_fixture/{provider}/getProviderActions`,
      validate: {
        params: (value: any, { ok }: RouteValidationResultFactory) => ok(value),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { provider } = req.params as { provider: string };

      logger.info(`test if get all provider actions is registered`);
      return res.ok({
        body: { actions: [...(eventLogService.getProviderActions().get(provider) ?? [])] },
      });
    }
  );
};

export const isIndexingEntriesRoute = (
  router: IRouter,
  eventLogService: IEventLogService,
  logger: Logger
) => {
  router.get(
    {
      path: `/api/log_event_fixture/isIndexingEntries`,
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      logger.info(`test if event logger is indexing entries`);
      return res.ok({ body: { isIndexingEntries: eventLogService.isIndexingEntries() } });
    }
  );
};

export const isEventLogServiceEnabledRoute = (
  router: IRouter,
  eventLogService: IEventLogService,
  logger: Logger
) => {
  router.get(
    {
      path: `/api/log_event_fixture/isEventLogServiceEnabled`,
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      logger.info(`test if event logger is enabled`);
      return res.ok({ body: { isEnabled: true } });
    }
  );
};

export const isEventLogServiceLoggingEntriesRoute = (
  router: IRouter,
  eventLogService: IEventLogService,
  logger: Logger
) => {
  router.get(
    {
      path: `/api/log_event_fixture/isEventLogServiceLoggingEntries`,
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      logger.info(`test if event logger is logging entries`);
      return res.ok({ body: { isLoggingEntries: eventLogService.isLoggingEntries() } });
    }
  );
};
