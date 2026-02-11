/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export interface EntityMaintainerWriter {}

export interface EntityMaintainerState {
  /** Set to true after the first run so setup is only executed once. */
  setupDone: boolean;
}

export interface EntityMaintainerTaskMethodContext {
  writer: EntityMaintainerWriter;
  state: EntityMaintainerState;
  soClient: SavedObjectsClientContract;
}

// export type EntityMaintainerTaskMethod = (context: EntityMaintainerTaskMethodContext) => Promise<void>;
export type EntityMaintainerTaskMethod = () => Promise<void>;

export interface RegisterEntityMaintainerConfig {
  id: string;
  name: string;
  description?: string;
  interval: string;
  stateSchema: Record<string, unknown>;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
}
