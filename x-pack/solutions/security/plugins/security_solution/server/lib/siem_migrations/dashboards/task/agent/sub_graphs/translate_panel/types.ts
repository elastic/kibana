/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ChatModel } from '../../../../../common/task/util/actions_client_chat';
import type { EsqlKnowledgeBase } from '../../../../../common/task/util/esql_knowledge_base';
import type { DashboardMigrationsRetriever } from '../../../retrievers';
import type { DashboardMigrationTelemetryClient } from '../../../dashboard_migrations_telemetry_client';
import type { translateDashboardPanelState } from './state';
import type { migrateDashboardConfigSchema } from '../../state';

export type TranslateDashboardPanelState = typeof translateDashboardPanelState.State;
export type TranslateDashboardPanelGraphConfig = RunnableConfig<
  (typeof migrateDashboardConfigSchema)['State']
>;
export type GraphNode = (
  state: TranslateDashboardPanelState,
  config: TranslateDashboardPanelGraphConfig
) => Promise<Partial<TranslateDashboardPanelState>>;

export interface TranslatePanelGraphParams {
  model: ChatModel;
  esScopedClient: IScopedClusterClient;
  esqlKnowledgeBase: EsqlKnowledgeBase;
  dashboardMigrationsRetriever: DashboardMigrationsRetriever;
  telemetryClient: DashboardMigrationTelemetryClient;
  logger: Logger;
}

export interface ValidationErrors {
  retries_left: number;
  esql_errors?: string;
}

export interface EsqlColumn {
  name: string;
  type: string;
}
