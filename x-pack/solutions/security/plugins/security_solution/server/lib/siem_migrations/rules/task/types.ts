/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import type { LangSmithEvaluationOptions } from '../../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationsDataClient } from '../data/rule_migrations_data_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { StoredRuleMigrationRule } from '../types';
import type { getRuleMigrationAgent } from './agent';
import type { RuleMigrationTelemetryClient } from './rule_migrations_telemetry_client';
import type { ChatModel } from '../../common/task/util/actions_client_chat';
import type { MigrationResources } from '../../common/task/retrievers/resource_retriever';
import type { RuleMigrationsRetriever } from './retrievers';
import type { MigrateRuleConfig } from './agent/types';

export type MigrationAgent = ReturnType<typeof getRuleMigrationAgent>;

export interface RuleMigrationInput extends Pick<StoredRuleMigrationRule, 'id' | 'original_rule'> {
  resources: MigrationResources;
}

export interface RuleMigrationTaskCreateClientParams {
  request: KibanaRequest;
  currentUser: AuthenticatedUser;
  dataClient: RuleMigrationsDataClient;
  dependencies: SiemMigrationsClientDependencies;
}

export interface RuleMigrationTaskStartParams {
  migrationId: string;
  connectorId: string;
  invocationConfig: MigrateRuleConfig;
}

export interface RuleMigrationTaskRunParams extends RuleMigrationTaskStartParams {
  model: ChatModel;
  abortController: AbortController;
}

export interface RuleMigrationTaskCreateAgentParams {
  connectorId: string;
  retriever: RuleMigrationsRetriever;
  telemetryClient: RuleMigrationTelemetryClient;
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
  invocationConfig: MigrateRuleConfig;
  abortController: AbortController;
}
