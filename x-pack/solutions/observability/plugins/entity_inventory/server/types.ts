/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreSetupContract, EntityStoreStartContract } from '@kbn/entity-store/server';

export type EntityInventoryPluginSetup = void;
export type EntityInventoryPluginStart = void;

export interface EntityInventorySetupDependencies {
  entityStore: EntityStoreSetupContract;
}

export interface EntityInventoryStartDependencies {
  entityStore: EntityStoreStartContract;
}
