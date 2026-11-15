/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin as PluginType } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerDigitalExperienceFeature } from './register_feature';

interface DigitalExperienceSetupDeps {
  features: FeaturesPluginSetup;
}

export class Plugin implements PluginType<void, void, DigitalExperienceSetupDeps> {
  public setup(core: CoreSetup, plugins: DigitalExperienceSetupDeps) {
    registerDigitalExperienceFeature(plugins.features);
  }

  public start() {}

  public stop() {}
}
