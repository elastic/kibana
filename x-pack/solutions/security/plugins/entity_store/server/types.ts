/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type { IRouter } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ResourcesService } from './domain/resources_service';
import type { FeatureFlags } from './infra/feature_flags';

export interface EntityStoreApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  logger: Logger;
  getResourcesService: () => ResourcesService;
  getFeatureFlags: () => FeatureFlags;
}

export type EntityStoreRequestHandlerContext = CustomRequestHandlerContext<{
  entityStore: EntityStoreApiRequestHandlerContext;
}>;

export type EntityStorePluginRouter = IRouter<EntityStoreRequestHandlerContext>;
