/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { InvestigateConfig } from './config';
import type {
  InvestigateServerSetup,
  InvestigateServerStart,
  InvestigateSetupDependencies,
  InvestigateStartDependencies,
} from './types';

export class InvestigatePlugin
  implements
    Plugin<
      InvestigateServerSetup,
      InvestigateServerStart,
      InvestigateSetupDependencies,
      InvestigateStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<InvestigateConfig>) {
    this.logger = context.logger.get();
  }
  setup(coreSetup: CoreSetup, pluginsSetup: InvestigateSetupDependencies): InvestigateServerSetup {
    return {};
  }

  start(coreStart: CoreStart, pluginsStart: InvestigateStartDependencies): InvestigateServerStart {
    return {};
  }
}
