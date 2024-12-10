/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LogsExplorerLocatorDefinition, LogsExplorerLocators } from '../common/locators';
import { createLogsExplorer } from './components/logs_explorer';
import { createLogsExplorerControllerLazyFactory } from './controller/lazy_create_controller';
import type {
  LogsExplorerPluginSetup,
  LogsExplorerPluginStart,
  LogsExplorerSetupDeps,
  LogsExplorerStartDeps,
} from './types';

export class LogsExplorerPlugin
  implements Plugin<LogsExplorerPluginSetup, LogsExplorerPluginStart>
{
  private locators?: LogsExplorerLocators;

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: LogsExplorerSetupDeps) {
    const { share } = plugins;
    const discoverAppLocator =
      share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    // Register Locators
    const logsExplorerLocator = share.url.locators.create(
      new LogsExplorerLocatorDefinition({
        discoverAppLocator,
      })
    );

    this.locators = {
      logsExplorerLocator,
    };

    return {
      locators: this.locators,
    };
  }

  public start(core: CoreStart, plugins: LogsExplorerStartDeps) {
    const LogsExplorer = createLogsExplorer({
      core,
      plugins,
    });

    const createLogsExplorerController = createLogsExplorerControllerLazyFactory({
      core,
      plugins,
    });

    return {
      LogsExplorer,
      createLogsExplorerController,
    };
  }
}
