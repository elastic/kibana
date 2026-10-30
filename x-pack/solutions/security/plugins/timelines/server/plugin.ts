/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { SetupPlugins, StartPlugins, TimelinesPluginUI, TimelinesPluginStart } from './types';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import type { ConfigSchema } from './config';

export class TimelinesPlugin
  implements Plugin<TimelinesPluginUI, TimelinesPluginStart, SetupPlugins, StartPlugins>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();

    // NOTE: underscored to skip lint warning, but it can be used to implement experimental features behind a flag
    const { features: _experimentalFeatures } = parseExperimentalConfigValue(
      initializerContext.config.get<ConfigSchema>().enableExperimental
    );
  }

  public setup(_core: CoreSetup<StartPlugins, TimelinesPluginStart>, _plugins: SetupPlugins) {
    this.logger.debug('timelines: Setup');
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('timelines: Started');
    return {};
  }

  public stop() {}
}
