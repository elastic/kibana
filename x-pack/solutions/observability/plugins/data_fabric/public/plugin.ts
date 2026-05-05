/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type {
  DataFabricPluginSetup,
  DataFabricPluginSetupDeps,
  DataFabricPluginStart,
  DataFabricPluginStartDeps,
} from './types';

export class DataFabricPlugin
  implements
    Plugin<
      DataFabricPluginSetup,
      DataFabricPluginStart,
      DataFabricPluginSetupDeps,
      DataFabricPluginStartDeps
    >
{
  public setup(
    core: CoreSetup<DataFabricPluginStartDeps, DataFabricPluginStart>,
    _pluginsSetup: DataFabricPluginSetupDeps
  ): DataFabricPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 8700,
      euiIconType: 'indexOpen',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: ['sideNav', 'globalSearch'],
      keywords: ['data fabric', 'streams', 'pipeline', 'shipper'],
      async mount(appMountParameters) {
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);
        return renderApp(coreStart, pluginsStart, appMountParameters);
      },
    });
  }

  public start(_core: CoreStart, _plugins: DataFabricPluginStartDeps): DataFabricPluginStart {}

  public stop() {}
}
