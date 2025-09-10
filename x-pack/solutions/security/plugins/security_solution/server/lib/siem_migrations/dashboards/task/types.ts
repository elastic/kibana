/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import type { LangSmithEvaluationOptions } from '../../../../../common/siem_migrations/model/common.gen';
import type { DashboardMigrationsDataClient } from '../data/dashboard_migrations_data_client';
import type { StoredDashboardMigrationDashboard } from '../types';
import type { getDashboardMigrationAgent } from './agent';
import type { DashboardMigrationTelemetryClient } from './dashboard_migrations_telemetry_client';
import type { ChatModel } from '../../common/task/util/actions_client_chat';
import type { DashboardMigrationsRetriever } from './retrievers';
import type { MigrateDashboardConfig } from './agent/types';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { MigrationResources } from '../../common/task/retrievers/resource_retriever';

export type MigrationAgent = ReturnType<typeof getDashboardMigrationAgent>;

export interface DashboardMigrationInput
  extends Pick<StoredDashboardMigrationDashboard, 'id' | 'original_dashboard'> {
  resources: MigrationResources;
}

export interface DashboardMigrationTaskCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser;
  dataClient: DashboardMigrationsDataClient;
  dependencies: SiemMigrationsClientDependencies;
}

export interface DashboardMigrationTaskStartParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: MigrateDashboardConfig;
}

export interface DashboardMigrationTaskRunParams extends DashboardMigrationTaskStartParams {
  model: ChatModel;
  abortController: AbortController;
}

export interface DashboardMigrationTaskCreateAgentParams {
  connectorId: string;
  retriever: DashboardMigrationsRetriever;
  telemetryClient: DashboardMigrationTelemetryClient;
  model: ChatModel;
}

export interface DashboardMigrationTaskStartResult {
  started: boolean;
  exists: boolean;
}

export interface DashboardMigrationTaskStopResult {
  stopped: boolean;
  exists: boolean;
}

export interface DashboardMigrationTaskEvaluateParams {
  evaluationId: string;
  connectorId: string;
  langsmithOptions: LangSmithEvaluationOptions;
  invocationConfig: MigrateDashboardConfig;
  abortController: AbortController;
}
