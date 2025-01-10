/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import { type ObservabilityLogsExplorerConfig } from '../common/plugin_config';
import { DATA_RECEIVED_TELEMETRY_EVENT } from '../common/telemetry_events';
import { logsExplorerAppTitle } from '../common/translations';
import type {
  ObservabilityLogsExplorerAppMountParameters,
  ObservabilityLogsExplorerPluginSetup,
  ObservabilityLogsExplorerPluginStart,
  ObservabilityLogsExplorerSetupDeps,
  ObservabilityLogsExplorerStartDeps,
} from './types';

export class ObservabilityLogsExplorerPlugin
  implements Plugin<ObservabilityLogsExplorerPluginSetup, ObservabilityLogsExplorerPluginStart>
{
  constructor(context: PluginInitializerContext<ObservabilityLogsExplorerConfig>) {}

  public setup(
    core: CoreSetup<ObservabilityLogsExplorerStartDeps, ObservabilityLogsExplorerPluginStart>,
    _pluginsSetup: ObservabilityLogsExplorerSetupDeps
  ) {
    // App used solely to redirect from "/app/observability-logs-explorer" to "/app/discover"
    core.application.register({
      id: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
      title: logsExplorerAppTitle,
      visibleIn: [],
      mount: async (appMountParams: ObservabilityLogsExplorerAppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { renderDiscoverRedirect } = await import('./applications/redirect_to_discover');
        return renderDiscoverRedirect(coreStart, appMountParams);
      },
    });

    // App used solely to redirect from "/app/observability-log-explorer" to "/app/discover"
    core.application.register({
      id: 'observability-log-explorer',
      title: logsExplorerAppTitle,
      visibleIn: [],
      mount: async (appMountParams: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { renderDiscoverRedirect } = await import('./applications/redirect_to_discover');
        return renderDiscoverRedirect(coreStart, appMountParams);
      },
    });

    core.analytics.registerEventType(DATA_RECEIVED_TELEMETRY_EVENT);

    return {};
  }

  public start(core: CoreStart, _pluginsStart: ObservabilityLogsExplorerStartDeps) {
    return {};
  }
}
