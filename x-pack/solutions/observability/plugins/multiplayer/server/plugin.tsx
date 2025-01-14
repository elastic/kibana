/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetupContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStartContract {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MultiPlayerServerPluginSetup {}

export class MultiPlayerServerPlugin implements Plugin<MultiPlayerServerPluginSetup, {}, {}, {}> {
  constructor(private initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup<PluginStartContract>, plugins: PluginSetupContract) {
    return {};
  }

  start(core: CoreStart, plugins: PluginStartContract) {
    return {};
  }

  stop() {}
}
