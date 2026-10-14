/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { SignificantEventsPublicSetupDependencies } from './types';
import { registerSignificantEventsWorkflowTriggers } from './workflows/triggers';
import type { SignificantEventsRepositoryClient } from './api';
import { createSignificantEventsRepositoryClient } from './api';

export type SignificantEventsPublicPluginSetup = Record<string, never>;

export interface SignificantEventsPublicPluginStart {
  significantEventsRepositoryClient: SignificantEventsRepositoryClient;
}

export class SignificantEventsPublicPlugin
  implements
    Plugin<
      SignificantEventsPublicPluginSetup,
      SignificantEventsPublicPluginStart,
      SignificantEventsPublicSetupDependencies
    >
{
  constructor(_ctx: PluginInitializerContext) {}

  setup(
    _core: CoreSetup,
    plugins: SignificantEventsPublicSetupDependencies
  ): SignificantEventsPublicPluginSetup {
    registerSignificantEventsWorkflowTriggers(plugins.workflowsExtensions);
    return {};
  }

  start(core: CoreStart): SignificantEventsPublicPluginStart {
    return {
      significantEventsRepositoryClient: createSignificantEventsRepositoryClient(core),
    };
  }
}
