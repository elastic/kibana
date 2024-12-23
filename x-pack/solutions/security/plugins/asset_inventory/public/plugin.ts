/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  AssetInventoryPluginSetup,
  AssetInventoryPluginStart,
  AppPluginStartDependencies,
} from './types';
import { getAssetInventoryLazy } from './methods';

export class AssetInventoryPlugin
  implements Plugin<AssetInventoryPluginSetup, AssetInventoryPluginStart>
{
  public setup(core: CoreSetup): AssetInventoryPluginSetup {
    return {};
  }
  public start(coreStart: CoreStart): AssetInventoryPluginStart {
    return {
      getAssetInventoryPage: (assetInventoryDeps: AppPluginStartDependencies) => {
        return getAssetInventoryLazy(assetInventoryDeps);
      },
    };
  }

  public stop() {}
}
