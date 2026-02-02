/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  PluginInitializerContext,
  Plugin,
  RequestHandlerContext,
} from '@kbn/core/server';
import type { MetricsDataPluginStartDeps } from './types';
import { MetricsDataClient } from './client';
import { metricsDataSourceSavedObjectType } from './saved_objects/metrics_data_source';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { initMetricExplorerRoute } from './routes/metrics_explorer';
import { initMetricIndicesRoute } from './routes/metric_indices';

export type MetricsDataPluginSetup = ReturnType<MetricsDataPlugin['setup']>;
export type MetricsDataPluginStart = ReturnType<MetricsDataPlugin['start']>;

export class MetricsDataPlugin
  implements Plugin<MetricsDataPluginSetup, MetricsDataPluginStart, {}, MetricsDataPluginStartDeps>
{
  private metricsClient: MetricsDataClient | null = null;

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup<MetricsDataPluginStartDeps>) {
    const router = core.http.createRouter();
    const framework = new KibanaFramework(core, router);

    initMetricExplorerRoute(framework);
    initMetricIndicesRoute<RequestHandlerContext>({
      router,
      metricsClient: new MetricsDataClient(),
    });

    core.savedObjects.registerType(metricsDataSourceSavedObjectType);

    this.metricsClient = new MetricsDataClient();
    return {
      client: this.metricsClient,
    };
  }

  public start() {
    return {};
  }

  public stop() {}
}
