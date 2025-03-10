/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type {
  WCICustomIndexPluginSetup,
  WCICustomIndexPluginStart,
  WCICustomIndexPluginSetupDependencies,
  WCICustomIndexPluginStartDependencies,
} from './types';

export class WCICustomIndexPlugin
  implements
    Plugin<
      WCICustomIndexPluginSetup,
      WCICustomIndexPluginStart,
      WCICustomIndexPluginSetupDependencies,
      WCICustomIndexPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WCICustomIndexPluginStartDependencies, WCICustomIndexPluginStart>
  ): WCICustomIndexPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: WCICustomIndexPluginStartDependencies
  ): WCICustomIndexPluginStart {
    return {};
  }

  public stop() {}
} 