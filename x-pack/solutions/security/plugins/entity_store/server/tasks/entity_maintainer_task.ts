/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export interface EntityMaintainerWriter {}

export interface EntityMaintainerState {}

export interface EntityMaintainerTaskMethodContext {
  writer: EntityMaintainerWriter;
  state: EntityMaintainerState;
  soClient: SavedObjectsClientContract;
}

export interface EntityMaintainerTaskMethod {
  (context: EntityMaintainerTaskMethodContext): Promise<void>;
}

export interface RegisterEntityMaintainerConfig {
  id: string;
  name: string;
  description?: string;
  schedule: string;
  stateSchema: Record<string, unknown>;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
}
