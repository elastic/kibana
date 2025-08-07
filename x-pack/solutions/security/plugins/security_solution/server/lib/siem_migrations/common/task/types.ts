/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { LangSmithEvaluationOptions } from '../../../../../common/siem_migrations/model/common.gen';
import type { SiemMigrationsDataClient } from '../data/siem_migrations_data_client';
import type { ItemDocument, SiemMigrationsClientDependencies } from '../types';
import type { Stored } from '../../types';

export interface SiemMigrationTaskCreateClientParams {
  currentUser: AuthenticatedUser;
  dataClient: SiemMigrationsDataClient;
  dependencies: SiemMigrationsClientDependencies;
}

export interface SiemMigrationTaskStartParams<C extends object = {}> {
  migrationId: string;
  connectorId: string;
  invocationConfig: RunnableConfig<C>;
}

export interface SiemMigrationTaskStartResult {
  started: boolean;
  exists: boolean;
}

export interface SiemMigrationTaskStopResult {
  stopped: boolean;
  exists: boolean;
}

export interface SiemMigrationTaskEvaluateParams<C extends object = {}> {
  evaluationId: string;
  connectorId: string;
  langsmithOptions: LangSmithEvaluationOptions;
  invocationConfig: RunnableConfig<C>;
  abortController: AbortController;
}

export type MigrationState<I extends ItemDocument = ItemDocument> = Partial<Stored<I>>;
export type MigrationTaskInvoke<I extends ItemDocument = ItemDocument> = () => Promise<
  MigrationState<I>
>;
export interface MigrationTask<I extends ItemDocument = ItemDocument, C extends object = {}> {
  prepare: (item: Stored<I>, config: RunnableConfig<C>) => Promise<MigrationTaskInvoke<I>>;
}

export interface RuleMigrationAgentRunOptions {
  skipPrebuiltRulesMatching: boolean;
}
