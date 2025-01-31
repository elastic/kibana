/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { SiemRuleMigrationsClientDependencies } from '../types';
import type { getRuleMigrationAgent } from './agent';

export type MigrationAgent = ReturnType<typeof getRuleMigrationAgent>;

export interface RuleMigrationTaskCreateClientParams {
  currentUser: AuthenticatedUser;
  dataClient: RuleMigrationsDataClient;
  dependencies: SiemRuleMigrationsClientDependencies;
}

export interface RuleMigrationTaskStartParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: RunnableConfig;
}

export interface RuleMigrationTaskCreateAgentParams extends RuleMigrationTaskStartParams {
  abortController: AbortController;
}

export interface RuleMigrationTaskStartResult {
  started: boolean;
  exists: boolean;
}

export interface RuleMigrationTaskStopResult {
  stopped: boolean;
  exists: boolean;
}
