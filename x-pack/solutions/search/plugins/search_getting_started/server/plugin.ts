/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  Logger,
} from '@kbn/core/server';
import type { SearchGettingStartedSetupDependencies } from './types';
import { registerSearchAgent } from './agent/register_search_agent';

export class SearchGettingStartedPlugin
  implements Plugin<{}, {}, SearchGettingStartedSetupDependencies>
{
  private readonly logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(_core: CoreSetup, plugins: SearchGettingStartedSetupDependencies) {
    registerSearchAgent({ plugins, logger: this.logger });
    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }
}
