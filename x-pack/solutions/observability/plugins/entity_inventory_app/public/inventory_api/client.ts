/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetTypesResponse, ListResponse } from '@kbn/entity-inventory-plugin/common';
import type { EntityInventoryRouteRepository } from '@kbn/entity-inventory-plugin/server';
import type { ClientRequestParamsOf } from '@kbn/server-route-repository-client';

export interface EntityInventoryRequestOptions {
  signal?: AbortSignal;
}

/** Data access for the entity inventory routes. */
export interface EntityInventoryApiClient {
  getTypes(options: EntityInventoryRequestOptions): Promise<GetTypesResponse>;
  getEntities(
    type: string,
    request: ClientRequestParamsOf<
      EntityInventoryRouteRepository,
      'POST /internal/entity_inventory/entities/{type}/_list'
    >['params']['body'],
    options: EntityInventoryRequestOptions
  ): Promise<ListResponse>;
}
