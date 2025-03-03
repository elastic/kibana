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
  CoreStart,
} from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';

import type {
  MetricsDataPluginSetup,
  MetricsDataPluginSetupDeps,
  MetricsDataPluginStartDeps,
} from './types';
import { MetricsDataClient } from './client';
import { metricsDataSourceSavedObjectType } from './saved_objects/metrics_data_source';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { initMetricExplorerRoute } from './routes/metrics_explorer';
import { initMetricIndicesRoute } from './routes/metric_indices';
import { IndicesMetadataService } from './lib/indices_metadata_service';
import { registerEvents as registerEbtEvents } from './lib/ebt/events';

export class MetricsDataPlugin
  implements
    Plugin<MetricsDataPluginSetup, {}, MetricsDataPluginSetupDeps, MetricsDataPluginStartDeps>
{
  private metricsClient: MetricsDataClient | null = null;

  private readonly logger: Logger;
  private indicesMetadataService: IndicesMetadataService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();

    this.indicesMetadataService = new IndicesMetadataService(
      this.logger.get('indicesMetadataService')
    );
  }

  public setup(
    core: CoreSetup<MetricsDataPluginStartDeps>,
    plugins: MetricsDataPluginSetupDeps
  ): MetricsDataPluginSetup {
    const router = core.http.createRouter();
    const framework = new KibanaFramework(core, router);

    initMetricExplorerRoute(framework);
    initMetricIndicesRoute<RequestHandlerContext>({
      router,
      metricsClient: new MetricsDataClient(),
    });

    core.savedObjects.registerType(metricsDataSourceSavedObjectType);

    if (plugins.taskManager) {
      this.indicesMetadataService.setup({
        taskManager: plugins.taskManager,
      });
    } else {
      this.logger.error('Task Manager not available');
    }

    registerEbtEvents(core.analytics);

    this.metricsClient = new MetricsDataClient();
    return {
      client: this.metricsClient,
    };
  }

  public async start(core: CoreStart, plugins: MetricsDataPluginStartDeps): Promise<{}> {
    if (plugins.taskManager) {
      const serviceStart = {
        taskManager: plugins.taskManager,
        esClient: core.elasticsearch.client.asInternalUser,
        analytics: core.analytics,
      };

      await this.indicesMetadataService.start(serviceStart);
    } else {
      this.logger.error('Task Manager not available');
    }

    return {};
  }

  public stop() {}
}
