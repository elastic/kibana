/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { MetricsExplorerViewsClient } from './metrics_explorer_views_client';
import type {
  MetricsExplorerViewsServiceSetup,
  MetricsExplorerViewsServiceStart,
  MetricsExplorerViewsServiceStartDeps,
} from './types';

export class MetricsExplorerViewsService {
  constructor(private readonly logger: Logger) {}

  public setup(): MetricsExplorerViewsServiceSetup {}

  public start({
    infraSources,
    savedObjects,
  }: MetricsExplorerViewsServiceStartDeps): MetricsExplorerViewsServiceStart {
    const { logger } = this;

    return {
      getClient(savedObjectsClient: SavedObjectsClientContract) {
        return new MetricsExplorerViewsClient(logger, savedObjectsClient, infraSources);
      },

      getScopedClient(request: KibanaRequest) {
        const savedObjectsClient = savedObjects.getScopedClient(request);

        return this.getClient(savedObjectsClient);
      },
    };
  }
}
