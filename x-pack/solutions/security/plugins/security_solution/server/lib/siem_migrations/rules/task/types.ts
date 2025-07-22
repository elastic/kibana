/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import type { LangSmithEvaluationOptions } from '../../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { SiemRuleMigrationsClientDependencies, StoredRuleMigration } from '../types';
import type { getRuleMigrationAgent } from './agent';
import type { SiemMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { ChatModel } from './util/actions_client_chat';
import type { RuleMigrationResources } from './retrievers/rule_resource_retriever';
import type { RuleMigrationsRetriever } from './retrievers';
import type { MigrateRuleGraphConfig } from './agent/types';

export type MigrationAgent = ReturnType<typeof getRuleMigrationAgent>;

export interface RuleMigrationInput extends Pick<StoredRuleMigration, 'id' | 'original_rule'> {
  resources: RuleMigrationResources;
}

export interface RuleMigrationTaskCreateClientParams {
  currentUser: AuthenticatedUser;
  dataClient: RuleMigrationsDataClient;
  dependencies: SiemRuleMigrationsClientDependencies;
}

export interface RuleMigrationTaskStartParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: MigrateRuleGraphConfig;
}

export interface RuleMigrationTaskRunParams extends RuleMigrationTaskStartParams {
  model: ChatModel;
  abortController: AbortController;
}

export interface RuleMigrationTaskCreateAgentParams {
  connectorId: string;
  retriever: RuleMigrationsRetriever;
  telemetryClient: SiemMigrationTelemetryClient;
  model: ChatModel;
}

export interface RuleMigrationTaskStartResult {
  started: boolean;
  exists: boolean;
}

export interface RuleMigrationTaskStopResult {
  stopped: boolean;
  exists: boolean;
}

export interface RuleMigrationTaskEvaluateParams {
  evaluationId: string;
  connectorId: string;
  langsmithOptions: LangSmithEvaluationOptions;
  invocationConfig: MigrateRuleGraphConfig;
  abortController: AbortController;
}
