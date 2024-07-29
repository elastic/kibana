/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, Plugin, CoreSetup } from '@kbn/core/server';
import { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { initRoutes } from './init_routes';

export interface PluginSetupDependencies {
  features: FeaturesPluginSetup;
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface PluginStartDependencies {
  features: FeaturesPluginStart;
  security: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

export const plugin: PluginInitializer<void, void> = async (): Promise<
  Plugin<void, void, PluginSetupDependencies, PluginStartDependencies>
> => ({
  setup: (core: CoreSetup<PluginStartDependencies>) => initRoutes(core),
  start: () => {},
  stop: () => {},
});
