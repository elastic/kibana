/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-server';

export type { EntityStoreStartContract, EntityStoreCRUDClient } from './types';
export type { BulkObject, BulkObjectResponse } from './domain/crud';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { EntityStorePlugin } = await import('./plugin');
  return new EntityStorePlugin(initializerContext);
}

export type { EntityStoreSetupContract } from './types';
export type {
  RegisterEntityMaintainerConfig,
  EntityMaintainerState,
} from './tasks/entity_maintainers/types';
export { CRUDClient } from './domain/crud/crud_client';
