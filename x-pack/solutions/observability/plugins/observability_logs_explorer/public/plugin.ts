/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { ObservabilityLogsExplorerConfig } from '../common';
import type {
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
    const title = i18n.translate('xpack.observabilityLogsExplorer.appTitle', {
      defaultMessage: 'Logs Explorer',
    });

    // App used solely to redirect from "/app/observability-logs-explorer" to "/app/discover"
    core.application.register({
      id: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
      title,
      visibleIn: [],
      mount: async (appMountParams) => {
        const [coreStart] = await core.getStartServices();
        const { renderDiscoverRedirect } = await import('./redirect_to_discover');
        return renderDiscoverRedirect(coreStart, appMountParams);
      },
    });

    // App used solely to redirect from "/app/observability-log-explorer" to "/app/discover"
    core.application.register({
      id: 'observability-log-explorer',
      title,
      visibleIn: [],
      mount: async (appMountParams) => {
        const [coreStart] = await core.getStartServices();
        const { renderDiscoverRedirect } = await import('./redirect_to_discover');
        return renderDiscoverRedirect(coreStart, appMountParams);
      },
    });

    return {};
  }

  public start(core: CoreStart, _pluginsStart: ObservabilityLogsExplorerStartDeps) {
    return {};
  }
}
