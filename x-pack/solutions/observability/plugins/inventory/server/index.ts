/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { InventoryConfig } from './config';
import { InventoryPlugin } from './plugin';
import type {
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';

export type { InventoryServerRouteRepository } from './routes/get_global_inventory_route_repository';

export type { InventoryServerSetup, InventoryServerStart };

import { config as configSchema } from './config';

export const config: PluginConfigDescriptor<InventoryConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InventoryConfig>) =>
  new InventoryPlugin(pluginInitializerContext);
