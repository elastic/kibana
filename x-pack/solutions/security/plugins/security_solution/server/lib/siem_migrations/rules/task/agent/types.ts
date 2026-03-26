/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Runnable, RunnableConfig } from '@langchain/core/runnables';
import type { InferenceChatModelCallOptions } from '@kbn/inference-langchain';
import type { AIMessageChunk } from '@langchain/core/messages';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import type { RuleMigrationsRetriever } from '../retrievers';
import type { EsqlKnowledgeBase } from '../../../common/task/util/esql_knowledge_base';
import type { ChatModel } from '../../../common/task/util/actions_client_chat';
import type { migrateRuleConfigSchema, migrateRuleState } from './state';
import type { RuleMigrationTelemetryClient } from '../rule_migrations_telemetry_client';
import type { RulesMigrationTools } from './tools';

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

export type ModelWithTools = Runnable<
  BaseLanguageModelInput,
  AIMessageChunk,
  InferenceChatModelCallOptions
>;

export interface MigrateRuleGraphParams {
  esqlKnowledgeBase: EsqlKnowledgeBase;
  model: ChatModel;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  logger: Logger;
  telemetryClient: RuleMigrationTelemetryClient;
  tools: RulesMigrationTools;
}
