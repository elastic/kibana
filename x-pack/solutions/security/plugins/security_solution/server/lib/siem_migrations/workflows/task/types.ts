/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import type { WorkflowMigrationsDataClient } from '../data/workflow_migrations_data_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { MigrateWorkflowConfig } from './agent/types';

export interface WorkflowMigrationTaskCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser;
  dataClient: WorkflowMigrationsDataClient;
  dependencies: SiemMigrationsClientDependencies;
}

export interface WorkflowMigrationTaskStartParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: MigrateWorkflowConfig;
}

export interface WorkflowMigrationTaskStartResult {
  started: boolean;
  exists: boolean;
}

export interface WorkflowMigrationTaskStopResult {
  stopped: boolean;
  exists: boolean;
}
