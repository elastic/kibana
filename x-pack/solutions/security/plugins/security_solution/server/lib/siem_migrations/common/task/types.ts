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
  abortController: AbortController;
}

export type Invocation<I extends ItemDocument = ItemDocument> = Promise<Stored<I>>;
export type Invoke<I extends ItemDocument = ItemDocument> = () => Invocation<I>;

export type MigrationTask<P extends object = {}, C extends object = {}, O extends object = {}> = (
  params: P,
  config?: RunnableConfig<C>
) => Promise<O>;

export interface RuleMigrationAgentRunOptions {
  skipPrebuiltRulesMatching: boolean;
}
export type MigrationState<T> = T;
