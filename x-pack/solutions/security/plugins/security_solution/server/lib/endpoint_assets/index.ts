/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EndpointAssetsService, createEndpointAssetsService } from './endpoint_assets_service';
export type { EndpointAssetsServiceOptions } from './endpoint_assets_service';
export * from './transforms';
export { registerEndpointAssetsRoutes } from './routes';
export * from './tasks';
