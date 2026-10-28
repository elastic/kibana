/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin as PluginType, PluginInitializerContext } from '@kbn/core/server';
import type { ApmDataAccessPluginSetup } from '@kbn/apm-data-access-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { registerDigitalExperienceFeature } from './register_feature';
import { getGlobalDigitalExperienceServerRouteRepository } from './routes/get_global_digital_experience_route_repository';

interface DigitalExperienceSetupDeps {
  features: FeaturesPluginSetup;
  /** Optional: only the Classic RUM source (stateful) needs it. */
  apmDataAccess?: ApmDataAccessPluginSetup;
  /** Optional: only its presence is read, as the Classic RUM source needs it. */
  ux?: unknown;
}

export class Plugin implements PluginType<void, void, DigitalExperienceSetupDeps> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DigitalExperienceSetupDeps) {
    registerDigitalExperienceFeature(plugins.features);

    const { buildFlavor } = this.initializerContext.env.packageInfo;
    registerRoutes({
      core,
      logger: this.initializerContext.logger.get(),
      repository: getGlobalDigitalExperienceServerRouteRepository(),
      dependencies: {
        plugins: { apmDataAccess: plugins.apmDataAccess },
        isServerless: buildFlavor === 'serverless',
        isUxEnabled: plugins.ux !== undefined,
      },
      runDevModeChecks: this.initializerContext.env.mode.dev,
    });
  }

  public start() {}

  public stop() {}
}
