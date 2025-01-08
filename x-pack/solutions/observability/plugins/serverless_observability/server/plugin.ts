/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';

import { OBSERVABILITY_PROJECT_SETTINGS } from '@kbn/serverless-observability-settings';
import type {
  ServerlessObservabilityPluginSetup,
  ServerlessObservabilityPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

export class ServerlessObservabilityPlugin
  implements
    Plugin<
      ServerlessObservabilityPluginSetup,
      ServerlessObservabilityPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(_coreSetup: CoreSetup, pluginsSetup: SetupDependencies) {
    pluginsSetup.serverless.setupProjectSettings(OBSERVABILITY_PROJECT_SETTINGS);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
