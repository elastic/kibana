/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { LicenseType } from '@kbn/licensing-types';
import type { EntityUpdateClient } from '../../domain/crud';

export const EntityMaintainerTaskStatus = {
  NEVER_STARTED: 'never_started',
  STARTED: 'started',
  STOPPED: 'stopped',
} as const;

export type EntityMaintainerTaskStatus =
  (typeof EntityMaintainerTaskStatus)[keyof typeof EntityMaintainerTaskStatus];

export const EntityMaintainerTelemetryEventType = {
  REGISTER: 'register',
  ABORT: 'abort',
  SETUP: 'setup',
  RUN: 'run',
  ERROR: 'error',
  STOP: 'stop',
  START: 'start',
  DELETE: 'delete',
  STATS: 'stats',
} as const;

export type EntityMaintainerTelemetryEventType =
  (typeof EntityMaintainerTelemetryEventType)[keyof typeof EntityMaintainerTelemetryEventType];

/**
 * One named stat bucket reported by an entity maintainer (e.g. integration queried, counts).
 * Prefer `values` as either all strings or all numbers within a single row so downstream analysis stays meaningful.
 */
export interface EntityMaintainerStatTelemetry {
  readonly name: string;
  readonly values: ReadonlyArray<string | number>;
}

export interface EntityMaintainerRegistryData {
  interval: string;
  description?: string;
  minLicense: LicenseType;
}

export interface EntityMaintainerTaskEntry extends EntityMaintainerRegistryData {
  id: string;
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
  taskStatus: EntityMaintainerTaskStatus;
}

interface EntityMaintainerTaskMethodContext {
  status: EntityMaintainerStatus;
  abortController: AbortController;
  logger: Logger;
  fakeRequest: KibanaRequest;
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  reportStats: (stats: ReadonlyArray<EntityMaintainerStatTelemetry>) => void;
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
  minLicense?: LicenseType;
}
