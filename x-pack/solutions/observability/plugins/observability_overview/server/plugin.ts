/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { OBSERVABILITY_OVERVIEW_FEATURE } from './feature';

export interface ObservabilityOverviewServerPluginSetupDeps {
  features: FeaturesPluginSetup;
}

export class ObservabilityOverviewServerPlugin implements Plugin {
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: ObservabilityOverviewServerPluginSetupDeps) {
    plugins.features.registerKibanaFeature(OBSERVABILITY_OVERVIEW_FEATURE);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}

