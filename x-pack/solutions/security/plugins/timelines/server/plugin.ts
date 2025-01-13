/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';

import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { SetupPlugins, StartPlugins, TimelinesPluginUI, TimelinesPluginStart } from './types';
import { timelineSearchStrategyProvider } from './search_strategy/timeline';
import { timelineEqlSearchStrategyProvider } from './search_strategy/timeline/eql';
import { indexFieldsProvider } from './search_strategy/index_fields';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { ConfigSchema } from './config';

export class TimelinesPlugin
  implements Plugin<TimelinesPluginUI, TimelinesPluginStart, SetupPlugins, StartPlugins>
{
  private readonly logger: Logger;
  private security?: SecurityPluginSetup;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();

    // NOTE: underscored to skip lint warning, but it can be used to implement experimental features behind a flag
    const { features: _experimentalFeatures } = parseExperimentalConfigValue(
      initializerContext.config.get<ConfigSchema>().enableExperimental
    );
  }

  public setup(core: CoreSetup<StartPlugins, TimelinesPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('timelines: Setup');
    this.security = plugins.security;

    const IndexFields = indexFieldsProvider(core.getStartServices);
    // Register search strategy
    void core.getStartServices().then(([_, depsStart]) => {
      const TimelineSearchStrategy = timelineSearchStrategyProvider(
        depsStart.data,
        this.logger,
        this.security
      );
      const TimelineEqlSearchStrategy = timelineEqlSearchStrategyProvider(depsStart.data);

      plugins.data.search.registerSearchStrategy('indexFields', IndexFields);
      plugins.data.search.registerSearchStrategy('timelineSearchStrategy', TimelineSearchStrategy);
      plugins.data.search.registerSearchStrategy(
        'timelineEqlSearchStrategy',
        TimelineEqlSearchStrategy
      );
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('timelines: Started');
    return {};
  }

  public stop() {}
}
