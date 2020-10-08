/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, Logger, PluginInitializerContext } from 'kibana/server';
import { IEventLogService, IEventLogClientService } from '../../../../../plugins/event_log/server';
import {
  logEventRoute,
  registerProviderActionsRoute,
  isProviderActionRegisteredRoute,
  getProviderActionsRoute,
  getLoggerRoute,
  isIndexingEntriesRoute,
  isEventLogServiceLoggingEntriesRoute,
  isEventLogServiceEnabledRoute,
} from './init_routes';

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
      namespaceType: 'single',
      mappings: {
        properties: {},
      },
    });

    logEventRoute(router, eventLogger, this.logger);

    // event log service api routes
    registerProviderActionsRoute(router, eventLog, this.logger);
    isProviderActionRegisteredRoute(router, eventLog, this.logger);
    getProviderActionsRoute(router, eventLog, this.logger);
    getLoggerRoute(router, eventLog, this.logger);
    isIndexingEntriesRoute(router, eventLog, this.logger);
    isEventLogServiceLoggingEntriesRoute(router, eventLog, this.logger);
    isEventLogServiceEnabledRoute(router, eventLog, this.logger);
  }

  public start() {}
  public stop() {}
}
