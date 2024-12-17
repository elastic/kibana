/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  AssetInventoryPluginSetup,
  AssetInventoryPluginStart,
  AppPluginStartDependencies,
} from './types';

export class AssetInventoryPlugin
  implements Plugin<AssetInventoryPluginSetup, AssetInventoryPluginStart>
{
  public setup(core: CoreSetup): AssetInventoryPluginSetup {
    return {};
  }
  public start(
    coreStart: CoreStart,
    depsStart: AppPluginStartDependencies
  ): AssetInventoryPluginStart {
    return {
      getAssetInventoryPage: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    };
  }

  public stop() {}
}
