/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SearchHomepageConfig } from './config';
import { createPreferredEndpointTracker } from './lib/analytics_generation_availability';
import { createGenerationCache } from './lib/analytics_generation_cache';
import { registerAnalyticsClusterStateRoute } from './routes/analytics_cluster_state';
import { registerAnalyticsEventsIndexRoute } from './routes/analytics_events_index';
import { registerAnalyticsEventsOverTimeRoute } from './routes/analytics_events_over_time';
import { registerAnalyticsGenerationRoutes } from './routes/analytics_generation';
import { registerAnalyticsSampleEventsRoutes } from './routes/analytics_sample_events';

interface SearchHomepageSetupDependencies {
  home?: HomeServerPluginSetup;
}

interface SearchHomepageStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  licensing?: LicensingPluginStart;
}

export class SearchHomepagePlugin
  implements Plugin<void, void, SearchHomepageSetupDependencies, SearchHomepageStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: SearchHomepageConfig;
  private readonly isServerless: boolean;

  constructor(initializerContext: PluginInitializerContext<SearchHomepageConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(
    core: CoreSetup<SearchHomepageStartDependencies>,
    { home }: SearchHomepageSetupDependencies
  ) {
    const router = core.http.createRouter();
    registerAnalyticsGenerationRoutes(router, this.logger, {
      config: this.config.analytics.generation,
      getDependencies: async () => {
        const [, { agentBuilder, licensing }] = await core.getStartServices();
        return { agentBuilder, licensing };
      },
      cache: createGenerationCache(),
      preferredEndpoint: createPreferredEndpointTracker(),
    });
    registerAnalyticsEventsOverTimeRoute(router, this.logger);
    registerAnalyticsSampleEventsRoutes(router, this.logger, { isServerless: this.isServerless });
    registerAnalyticsEventsIndexRoute(router, this.logger);
    registerAnalyticsClusterStateRoute(router, this.logger, {
      // Read per request: other plugins add dashboards to the sample data sets during their setup.
      getSampleDashboardIds: () =>
        (home?.sampleData.getSampleDatasets() ?? []).flatMap(({ savedObjects }) =>
          savedObjects.filter(({ type }) => type === 'dashboard').map(({ id }) => id)
        ),
    });
  }

  public start() {}
}
