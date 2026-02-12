/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export interface EntityMaintainerWriter { }

export interface EntityMaintainerStatusMetaData {
  runs: number;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}


type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | EntityMaintainerState | JsonValue[];
interface EntityMaintainerState {
  [key: string]: JsonValue;
}

export interface EntityMaintainerStatus extends Record<string, unknown> {
  metaData: EntityMaintainerStatusMetaData;
  state: EntityMaintainerState;
}

interface EntityMaintainerTaskMethodContext {
  state: EntityMaintainerStatus;
}

export type EntityMaintainerTaskMethod = (context: EntityMaintainerTaskMethodContext) => Promise<EntityMaintainerState>;

export interface RegisterEntityMaintainerConfig {
  id: string;
  name: string;
  description?: string;
  interval: string;
  initialState: EntityMaintainerState;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
}
