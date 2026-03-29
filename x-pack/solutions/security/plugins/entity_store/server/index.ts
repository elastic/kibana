/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core-plugins-server';

export type {
  EntityStoreSetupContract,
  EntityStoreStartContract,
  EntityStoreCRUDClient,
} from './types';
export type { RegisterEntityMaintainerConfig } from './tasks/entity_maintainers/types';
export type { EntityUpdateClient, BulkObject, BulkObjectResponse } from './domain/crud';
export { getLatestEntitiesIndexName } from '../common';
export { getHistorySnapshotIndexPattern } from './domain/asset_manager/history_snapshot_index';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { EntityStorePlugin } = await import('./plugin');
  return new EntityStorePlugin(initializerContext);
}
