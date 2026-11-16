/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import type { InventoryService } from '../service/inventory_service';

export type GetInventoryService = (request: KibanaRequest) => Promise<InventoryService>;

export interface EntityInventoryRouteHandlerResources extends DefaultRouteHandlerResources {
  getInventoryService: GetInventoryService;
}
