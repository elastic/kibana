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
import type { ProfilingConfig } from '.';
import { PROFILING_FEATURE, PROFILING_SERVER_FEATURE_ID } from './feature';
import { registerRoutes } from './routes';
import type {
  ProfilingPluginSetup,
  ProfilingPluginSetupDeps,
  ProfilingPluginStart,
  ProfilingPluginStartDeps,
  ProfilingRequestHandlerContext,
} from './types';

export class ProfilingPlugin implements Plugin<
  ProfilingPluginSetup,
  ProfilingPluginStart,
  ProfilingPluginSetupDeps,
  ProfilingPluginStartDeps
> {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext<ProfilingConfig>) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<ProfilingPluginStartDeps>, deps: ProfilingPluginSetupDeps) {
    const router = core.http.createRouter<ProfilingRequestHandlerContext>();

    deps.features.registerKibanaFeature(PROFILING_FEATURE);

    const config = this.initializerContext.config.get();
    const stackVersion = this.initializerContext.env.packageInfo.version;
    const buildFlavor = this.initializerContext.env.packageInfo.buildFlavor;

    const telemetryUsageCounter = deps.usageCollection?.createUsageCounter(
      PROFILING_SERVER_FEATURE_ID
    );

    core
      .getStartServices()
      .then(([coreStart, depsStart]) => {
        const esCapabilities = coreStart.elasticsearch.getCapabilities();

        registerRoutes({
          router,
          logger: this.logger!,
          dependencies: {
            start: depsStart,
            setup: deps,
            config,
            stackVersion,
            buildFlavor,
            telemetryUsageCounter,
            esCapabilities,
          },
          services: {
            createProfilingEsClient: depsStart.profilingDataAccess.createProfilingEsClient,
          },
        });
      })
      .catch(() => {});

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
