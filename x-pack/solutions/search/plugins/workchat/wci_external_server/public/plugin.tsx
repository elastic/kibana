/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type {
  WCIExternalServerPluginSetup,
  WCIExternalServerPluginStart,
  WCIExternalServerPluginSetupDependencies,
  WCIExternalServerPluginStartDependencies,
} from './types';

export class WCIExternalServerPlugin
  implements
    Plugin<
      WCIExternalServerPluginSetup,
      WCIExternalServerPluginStart,
      WCIExternalServerPluginSetupDependencies,
      WCIExternalServerPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WCIExternalServerPluginStartDependencies, WCIExternalServerPluginStart>
  ): WCIExternalServerPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: WCIExternalServerPluginStartDependencies
  ): WCIExternalServerPluginStart {
    return {};
  }

  public stop() {}
} 