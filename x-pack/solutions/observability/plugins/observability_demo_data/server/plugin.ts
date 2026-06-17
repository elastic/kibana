/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ObservabilityDemoDataConfig } from './config';
import { registerSynthtraceRoutes } from './routes/synthtrace_routes';

export type ObservabilityDemoDataPluginSetup = void;
export type ObservabilityDemoDataPluginStart = void;

export class ObservabilityDemoDataPlugin
  implements Plugin<ObservabilityDemoDataPluginSetup, ObservabilityDemoDataPluginStart>
{
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): ObservabilityDemoDataPluginSetup {
    const config = this.initializerContext.config.get<ObservabilityDemoDataConfig>();
    const router = core.http.createRouter();

    registerSynthtraceRoutes({ router, config, logger: this.logger });
  }

  public start(_core: CoreStart): ObservabilityDemoDataPluginStart {}

  public stop(): void {}
}
