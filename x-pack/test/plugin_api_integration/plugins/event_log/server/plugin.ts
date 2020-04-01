/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  CoreSetup,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
  Logger,
  PluginInitializerContext,
} from 'kibana/server';
import { schema } from '@kbn/config-schema';
import {
  IEventLogService,
  IEventLogClientService,
  IEventLogger,
} from '../../../../../plugins/event_log/server';
import { EventSchema } from '../../../../../plugins/event_log/server/types';

// this plugin's dependendencies
export interface EventLogFixtureSetupDeps {
  eventLog: IEventLogService;
}
export interface EventLogFixtureStartDeps {
  eventLog: IEventLogClientService;
}

export class EventLogFixturePlugin
  implements Plugin<void, void, EventLogFixtureSetupDeps, EventLogFixtureStartDeps> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'eventLogFixture');
  }

  public setup(core: CoreSetup, { eventLog }: EventLogFixtureSetupDeps) {
    const router = core.http.createRouter();

    eventLog.registerProviderActions('event_log_fixture', ['test']);
    const eventLogger = eventLog.getLogger({
      event: { provider: 'event_log_fixture' },
    });

    core.savedObjects.registerType({
      name: 'event_log_test',
      hidden: false,
      namespaceAgnostic: true,
      mappings: {
        properties: {},
      },
    });

    logEventRoute(router, eventLogger, this.logger);
  }

  public start() {}
  public stop() {}
}

const paramSchema = schema.object({
  id: schema.string(),
});

const logEventRoute = (router: IRouter, eventLogger: IEventLogger, logger: Logger) => {
  router.post(
    {
      path: `/api/log_event_fixture/{id}/_log`,
      validate: {
        params: paramSchema,
        body: EventSchema,
      },
    },
    async function(
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { id } = req.params;
      logger.info(`log event: ${id}`);
      try {
        await context.core.savedObjects.client.get('event_log_test', id);
        logger.info(`found existing saved object`);
      } catch (ex) {
        logger.info(`log event error: ${ex}`);
        await context.core.savedObjects.client.create('event_log_test', {}, { id });
        logger.info(`created saved object`);
      }
      eventLogger.logEvent(req.body);
      logger.info(`logged`);
      return res.ok({});
    }
  );
};
