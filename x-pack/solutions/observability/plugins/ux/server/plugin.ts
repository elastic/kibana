/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { registerRoutes } from '@kbn/server-route-repository';
import { getUxServerRouteRepository } from './routes';
import type { UxRouteHandlerResources } from './routes/types';
import { sessionReplaySettingsSavedObjectType } from './saved_objects/session_replay_settings';
import { rumReportScheduleSavedObjectType } from './saved_objects/rum_report_schedule';
import {
  installRumAnalystAgent,
  registerRumAnalystAgentType,
  registerRumTools,
} from './agent_builder';
import type { UxPluginSetupDeps, UxPluginStartDeps } from './plugin_types';
import { registerRumReportEmailTask } from './tasks/rum_report_email_task';

export type { UxPluginSetupDeps, UxPluginStartDeps } from './plugin_types';

export class Plugin implements PluginType {
  private readonly logger: Logger;
  private readonly initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<UxPluginStartDeps>, plugins: UxPluginSetupDeps = {}) {
    core.savedObjects.registerType(sessionReplaySettingsSavedObjectType);
    core.savedObjects.registerType(rumReportScheduleSavedObjectType);

    const dependencies: Omit<UxRouteHandlerResources, keyof DefaultRouteHandlerResources> = {
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
      startPlugins: async () => {
        const [, startPlugins] = await core.getStartServices();
        return startPlugins;
      },
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: getUxServerRouteRepository(),
      dependencies,
      runDevModeChecks: this.initContext.env.mode.dev,
    });

    if (plugins.agentBuilder) {
      registerRumTools({
        agentBuilder: plugins.agentBuilder,
        core,
        logger: this.logger,
      });
      registerRumAnalystAgentType(plugins.agentBuilder);
    }

    if (plugins.taskManager) {
      registerRumReportEmailTask({
        core,
        logger: this.logger,
        taskManager: plugins.taskManager,
      });
    }

    return {};
  }

  public start(_coreStart: CoreStart, plugins: UxPluginStartDeps = {}) {
    if (plugins.agentBuilder) {
      installRumAnalystAgent({
        agentBuilder: plugins.agentBuilder,
        spaceId: DEFAULT_SPACE_ID,
      }).catch((error) => {
        this.logger.error(`Failed to install RUM Analyst agent: ${error}`);
      });
    }
  }

  public stop() {}
}
