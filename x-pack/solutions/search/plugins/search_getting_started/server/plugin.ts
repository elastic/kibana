/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';

export class SearchGettingStartedPlugin implements Plugin {
  constructor(_initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    // Minimal server plugin - no setup needed
    return {};
  }

  public start(core: CoreStart) {
    // Minimal server plugin - no start logic needed
    return {};
  }
}
