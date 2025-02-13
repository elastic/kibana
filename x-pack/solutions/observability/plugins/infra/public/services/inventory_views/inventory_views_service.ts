/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InventoryViewsServiceStartDeps,
  InventoryViewsServiceSetup,
  InventoryViewsServiceStart,
  IInventoryViewsClient,
} from './types';

export class InventoryViewsService {
  private client?: IInventoryViewsClient;

  public setup(): InventoryViewsServiceSetup {
    return {};
  }

  public start({ http }: InventoryViewsServiceStartDeps): InventoryViewsServiceStart {
    return {
      getClient: () => this.getClient({ http }),
    };
  }

  private async getClient({ http }: InventoryViewsServiceStartDeps) {
    if (!this.client) {
      const { InventoryViewsClient } = await import('./inventory_views_client');
      const client = new InventoryViewsClient(http);
      this.client = client;
    }

    return this.client;
  }
}
