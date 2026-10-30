/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryListRequest, InventoryListResponse, InventoryTypesResponse } from './types';

/** The default and maximum number of entities a `_list` request returns. */
export const ENTITY_INVENTORY_LIST_LIMIT = 10_000;

export interface EntityInventoryRequestOptions {
  signal?: AbortSignal;
}

/** Data access for the entity inventory routes. */
export interface EntityInventoryApiClient {
  getTypes(options: EntityInventoryRequestOptions): Promise<InventoryTypesResponse>;
  listEntities(
    type: string,
    request: InventoryListRequest,
    options: EntityInventoryRequestOptions
  ): Promise<InventoryListResponse>;
}
