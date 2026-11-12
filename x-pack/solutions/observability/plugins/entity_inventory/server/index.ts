/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { EntityInventoryConfig } from './config';
import type {
  EntityInventoryPluginSetup,
  EntityInventoryPluginStart,
  EntityInventorySetupDependencies,
  EntityInventoryStartDependencies,
} from './types';

export { config } from './config';
export type { EntityInventoryConfig } from './config';
export type {
  EntityInventoryPluginSetup,
  EntityInventoryPluginStart,
  EntityInventorySetupDependencies,
  EntityInventoryStartDependencies,
} from './types';
export type { EntityInventoryRouteRepository } from './routes';
export type {
  InventoryRow,
  InventoryType,
  InventoryTypeColumn,
  ListResponse,
  OutputColumnKind,
  SourceError,
  UnavailableColumn,
} from '../common';

export const plugin: PluginInitializer<
  EntityInventoryPluginSetup,
  EntityInventoryPluginStart,
  EntityInventorySetupDependencies,
  EntityInventoryStartDependencies
> = async (initializerContext: PluginInitializerContext<EntityInventoryConfig>) => {
  const { EntityInventoryPlugin } = await import('./plugin');
  return new EntityInventoryPlugin(initializerContext);
};
