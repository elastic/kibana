/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type { IRouter } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { AssetManager } from './domain/asset_manager';
import type { FeatureFlags } from './infra/feature_flags';
import type { LogsExtractionClient } from './domain/logs_extraction_client';

export interface EntityStoreSetupPlugins {
  taskManager: TaskManagerSetupContract;
  spaces: SpacesPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}

export interface EntityStoreStartPlugins {
  taskManager: TaskManagerStartContract;
  spaces: SpacesPluginStart;
  dataViews: DataViewsPluginStart;
  security: SecurityPluginStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export interface EntityStoreApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  logger: Logger;
  assetManager: AssetManager;
  featureFlags: FeatureFlags;
  logsExtractionClient: LogsExtractionClient;
  security: SecurityPluginStart;
}

export type EntityStoreRequestHandlerContext = CustomRequestHandlerContext<{
  entityStore: EntityStoreApiRequestHandlerContext;
}>;

export type EntityStorePluginRouter = IRouter<EntityStoreRequestHandlerContext>;

export type PluginStartContract = void;
export type PluginSetupContract = void;

export type EntityStoreCoreSetup = CoreSetup<EntityStoreStartPlugins, PluginStartContract>;
