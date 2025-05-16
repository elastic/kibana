/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type {
  InventoryViewRequestQuery,
  UpdateInventoryViewAttributesRequestPayload,
} from '../../../common/http_api/latest';
import type { InventoryView } from '../../../common/inventory_views';
import type { InfraSources } from '../../lib/sources';

export interface InventoryViewsServiceStartDeps {
  infraSources: InfraSources;
  savedObjects: SavedObjectsServiceStart;
}

export type InventoryViewsServiceSetup = void;

export interface InventoryViewsServiceStart {
  getClient(savedObjectsClient: SavedObjectsClientContract): IInventoryViewsClient;
  getScopedClient(request: KibanaRequest): IInventoryViewsClient;
}

export interface IInventoryViewsClient {
  delete(inventoryViewId: string): Promise<{}>;
  find(query: InventoryViewRequestQuery): Promise<InventoryView[]>;
  get(inventoryViewId: string, query: InventoryViewRequestQuery): Promise<InventoryView>;
  update(
    inventoryViewId: string | null,
    inventoryViewAttributes: UpdateInventoryViewAttributesRequestPayload,
    query: InventoryViewRequestQuery
  ): Promise<InventoryView>;
}
