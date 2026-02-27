/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

export interface EntityMaintainerConfig {
  interval: string;
}

export interface EntityMaintainerTaskEntry {
  id: string;
  interval: string;
}

export interface EntityMaintainerStatusMetadata {
  namespace: string;
  runs: number;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | EntityMaintainerState | JsonValue[];
export interface EntityMaintainerState {
  [key: string]: JsonValue;
}

export interface EntityMaintainerStatus extends Record<string, unknown> {
  metadata: EntityMaintainerStatusMetadata;
  state: EntityMaintainerState;
}

interface EntityMaintainerTaskMethodContext {
  status: EntityMaintainerStatus;
  abortController: AbortController;
  logger: Logger;
  fakeRequest: KibanaRequest;
  esClient: ElasticsearchClient;
}

export type EntityMaintainerTaskMethod = (
  context: EntityMaintainerTaskMethodContext
) => Promise<EntityMaintainerState>;

export interface RegisterEntityMaintainerConfig {
  id: string;
  description?: string;
  interval: string;
  initialState: EntityMaintainerState;
  run: EntityMaintainerTaskMethod;
  setup?: EntityMaintainerTaskMethod;
}
