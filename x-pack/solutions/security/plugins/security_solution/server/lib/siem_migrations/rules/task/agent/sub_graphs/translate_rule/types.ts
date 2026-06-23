/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { EsqlKnowledgeBase } from '../../../../../common/task/util/esql_knowledge_base';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { RuleMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import type { migrateRuleConfigSchema } from '../../state';
import type { MigrateRuleGraphParams } from '../../types';
import type { translateRuleState } from './state';

export type TranslateRuleState = typeof translateRuleState.State;
export type TranslateRuleConfigSchema = (typeof migrateRuleConfigSchema)['State'];
export type TranslateRuleConfig = RunnableConfig<TranslateRuleConfigSchema>;
export type GraphNode = (
  state: TranslateRuleState,
  config: TranslateRuleConfig
) => Promise<Partial<TranslateRuleState>>;

export interface TranslateRuleGraphParams {
  model: MigrateRuleGraphParams['model'];
  esqlKnowledgeBase: EsqlKnowledgeBase;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  telemetryClient: RuleMigrationTelemetryClient;
  logger: Logger;
}

export interface TranslateRuleValidationErrors {
  retries_left: number;
  esql_errors?: string;
}
