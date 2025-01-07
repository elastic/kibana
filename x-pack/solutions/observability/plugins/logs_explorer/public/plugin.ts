/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
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
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: LogsExplorerSetupDeps) {
    return {};
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
