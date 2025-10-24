/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type {
  WorkplaceAIConnectorsServerSetup,
  WorkplaceAIConnectorsServerSetupDependencies,
  WorkplaceAIConnectorsServerStart,
  WorkplaceAIConnectorsServerStartDependencies,
} from './types';

export class WorkplaceAIConnectorsServerPlugin
  implements
    Plugin<
      WorkplaceAIConnectorsServerSetup,
      WorkplaceAIConnectorsServerStart,
      WorkplaceAIConnectorsServerSetupDependencies,
      WorkplaceAIConnectorsServerStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}
  setup(core: CoreSetup): WorkplaceAIConnectorsServerSetup {
    return {};
  }
  start(core: CoreStart): WorkplaceAIConnectorsServerStart {
    return {};
  }
}
