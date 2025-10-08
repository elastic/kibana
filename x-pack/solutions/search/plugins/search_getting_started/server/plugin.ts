/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type {
  SearchGettingStartedPluginSetup,
  SearchGettingStartedPluginStart,
  SearchGettingStartedPluginSetupDeps,
  SearchGettingStartedPluginStartDeps,
} from './types';

export class SearchGettingStartedPlugin
  implements Plugin<SearchGettingStartedPluginSetup, SearchGettingStartedPluginStart, SearchGettingStartedPluginSetupDeps, SearchGettingStartedPluginStartDeps>
{
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<SearchGettingStartedPluginStartDeps, SearchGettingStartedPluginStart>,
    deps: SearchGettingStartedPluginSetupDeps
  ) {
    return {};
  }

  public start(core: CoreStart, deps: SearchGettingStartedPluginStartDeps) {
    return {};
  }
}