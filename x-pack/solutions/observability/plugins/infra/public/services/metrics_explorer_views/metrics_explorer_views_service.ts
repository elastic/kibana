/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MetricsExplorerViewsServiceStartDeps,
  MetricsExplorerViewsServiceSetup,
  MetricsExplorerViewsServiceStart,
  IMetricsExplorerViewsClient,
} from './types';

export class MetricsExplorerViewsService {
  private client?: IMetricsExplorerViewsClient;

  public setup(): MetricsExplorerViewsServiceSetup {
    return {};
  }

  public start({ http }: MetricsExplorerViewsServiceStartDeps): MetricsExplorerViewsServiceStart {
    return {
      getClient: () => this.getClient({ http }),
    };
  }

  private async getClient({ http }: MetricsExplorerViewsServiceStartDeps) {
    if (!this.client) {
      const { MetricsExplorerViewsClient } = await import('./metrics_explorer_views_client');
      const client = new MetricsExplorerViewsClient(http);
      this.client = client;
    }

    return this.client;
  }
}
