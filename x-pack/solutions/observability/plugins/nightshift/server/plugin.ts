/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerNightshiftFeature } from './register_feature';
import type {
  NightshiftServerSetup,
  NightshiftServerSetupDependencies,
  NightshiftServerStart,
  NightshiftServerStartDependencies,
} from './types';

export class NightshiftServerPlugin
  implements
    Plugin<
      NightshiftServerSetup,
      NightshiftServerStart,
      NightshiftServerSetupDependencies,
      NightshiftServerStartDependencies
    >
{
  constructor(_context: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<NightshiftServerStartDependencies, NightshiftServerStart>,
    plugins: NightshiftServerSetupDependencies
  ): NightshiftServerSetup {
    registerNightshiftFeature(plugins.features);
    return {};
  }

  public start(): NightshiftServerStart {
    return {};
  }

  public stop() {}
}
