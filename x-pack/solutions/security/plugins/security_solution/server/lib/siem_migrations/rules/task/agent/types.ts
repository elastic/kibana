/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { RuleMigrationsRetriever } from '../retrievers';
import type { EsqlKnowledgeBase } from '../../../common/task/util/esql_knowledge_base';
import type { ChatModel } from '../../../common/task/util/actions_client_chat';
import type { migrateRuleConfigSchema, migrateRuleState } from './state';
import type { RuleMigrationTelemetryClient } from '../rule_migrations_telemetry_client';

export type MigrateRuleState = typeof migrateRuleState.State;
export type MigrateRuleConfigSchema = (typeof migrateRuleConfigSchema)['State'];
export type MigrateRuleConfig = RunnableConfig<MigrateRuleConfigSchema>;
export type GraphNode = (
  state: MigrateRuleState,
  config: MigrateRuleConfig
) => Promise<Partial<MigrateRuleState>>;

export interface RuleMigrationAgentRunOptions {
  skipPrebuiltRulesMatching: boolean;
}

export interface MigrateRuleGraphParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  model: ChatModel;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  logger: Logger;
  telemetryClient: RuleMigrationTelemetryClient;
}
