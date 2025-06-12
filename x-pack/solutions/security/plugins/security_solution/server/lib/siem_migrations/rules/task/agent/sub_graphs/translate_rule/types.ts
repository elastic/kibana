/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EsqlKnowledgeBase } from '../../../util/esql_knowledge_base';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { SiemMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { translateRuleState } from './state';

export type TranslateRuleState = typeof translateRuleState.State;
export type GraphNode = (state: TranslateRuleState) => Promise<Partial<TranslateRuleState>>;

export interface TranslateRuleGraphParams {
  model: ChatModel;
  esqlKnowledgeBase: EsqlKnowledgeBase;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  telemetryClient: SiemMigrationTelemetryClient;
  logger: Logger;
}

export interface TranslateRuleValidationErrors {
  iterations: number;
  esql_errors?: string;
}
