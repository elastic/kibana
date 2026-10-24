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
import { rumAlertNotificationsSavedObjectType } from './saved_objects/rum_alert_notifications';
import { conversionGoalSavedObjectType } from './saved_objects/conversion_goal';
import { rumAppSavedObjectType } from './saved_objects/rum_app';
import {
  installRumAnalystAgent,
  registerRumAnalystAgentType,
  registerRumSkills,
  registerRumTools,
} from './agent_builder';
import type { UxPluginSetupDeps, UxPluginStartDeps } from './plugin_types';
import { registerRumReportEmailTask } from './tasks/rum_report_email_task';
import {
  registerRumSessionsReconcileTask,
  scheduleRumSessionsReconcileTask,
} from './tasks/rum_sessions_reconcile_task';
import type { UXConfig } from '../common/config';
import { configureUxInspect } from './lib/inspect/inspectable_es_queries_map';
import { configureRumSessionsTransform } from './transforms/rum_sessions';
import { registerUxOverviewPanelEmbeddable } from './embeddables/register_overview_panel_embeddable';

export type { UxPluginSetupDeps, UxPluginStartDeps } from './plugin_types';

export class Plugin implements PluginType {
  private readonly logger: Logger;
  private readonly initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup<UxPluginStartDeps>, plugins: UxPluginSetupDeps = {}) {
    const config = this.initContext.config.get<UXConfig>();
    configureRumSessionsTransform({ syncDelay: config.sessionAnalytics.syncDelay });
    configureUxInspect({ isDev: this.initContext.env.mode.dev });

    core.savedObjects.registerType(sessionReplaySettingsSavedObjectType);
    core.savedObjects.registerType(rumReportScheduleSavedObjectType);
    core.savedObjects.registerType(rumAlertNotificationsSavedObjectType);
    core.savedObjects.registerType(conversionGoalSavedObjectType);
    core.savedObjects.registerType(rumAppSavedObjectType);

    const dependencies: Omit<UxRouteHandlerResources, keyof DefaultRouteHandlerResources> = {
      core: {
        setup: core,
        start: () => core.getStartServices().then(([coreStart]) => coreStart),
      },
      startPlugins: async () => {
        const [, startPlugins] = await core.getStartServices();
        return startPlugins;
      },
      workflowsManagement: plugins.workflowsManagement,
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
      registerRumSkills(plugins.agentBuilder);
      registerRumAnalystAgentType(plugins.agentBuilder);
    }

    if (plugins.taskManager) {
      registerRumReportEmailTask({
        core,
        logger: this.logger,
        taskManager: plugins.taskManager,
      });
      registerRumSessionsReconcileTask({
        core,
        logger: this.logger,
        taskManager: plugins.taskManager,
      });
    }

    if (plugins.embeddable) {
      registerUxOverviewPanelEmbeddable(plugins.embeddable);
    }

    return {};
  }

  public start(_coreStart: CoreStart, plugins: UxPluginStartDeps = {}) {
    if (plugins.taskManager) {
      scheduleRumSessionsReconcileTask(plugins.taskManager).catch((error) => {
        this.logger.error(`Failed to schedule rum-sessions reconcile: ${error}`);
      });
    }
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
