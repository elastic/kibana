/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type { DashboardMigrationsRetriever } from '../retrievers';
import type { EsqlKnowledgeBase } from '../../../common/task/util/esql_knowledge_base';
import type { ChatModel } from '../../../common/task/util/actions_client_chat';
import type { migrateDashboardConfigSchema, migrateDashboardState } from './state';
import type { DashboardMigrationTelemetryClient } from '../dashboard_migrations_telemetry_client';
import type { ParsedPanel } from '../../lib/parsers/types';

export type MigrateDashboardState = typeof migrateDashboardState.State;
export type MigrateDashboardConfigSchema = (typeof migrateDashboardConfigSchema)['State'];
export type MigrateDashboardConfig = RunnableConfig<MigrateDashboardConfigSchema>;

export type GraphNode = (
  state: MigrateDashboardState,
  config: MigrateDashboardConfig
) => Promise<Partial<MigrateDashboardState>>;

export interface DashboardMigrationAgentRunOptions {
  skipPrebuiltDashboardsMatching: boolean;
}

export interface MigrateDashboardGraphParams {
  model: ChatModel;
  esScopedClient: IScopedClusterClient;
  esqlKnowledgeBase: EsqlKnowledgeBase;
  dashboardMigrationsRetriever: DashboardMigrationsRetriever;
  logger: Logger;
  telemetryClient: DashboardMigrationTelemetryClient;
}

export interface ParsedOriginalDashboard {
  title: string;
  panels: Array<ParsedPanel>;
}

export type TranslatedPanels = Array<{
  /**
   * The index in the panels array, to keep the same order as in the original dashboard.
   * this is probably not necessary since we have already calculated the `position` of each panel, but maintained for consistency
   */
  index: number;
  /* The visualization json */
  data: object;
  /* The individual panel translation result */
  translation_result: MigrationTranslationResult;
}>;

export type FailedPanelTranslations = Array<{
  index: number;
  error_message: string;
  details: unknown;
}>;

export interface TranslatePanelNodeParams {
  panel: ParsedPanel;
  index: number;
}
export type TranslatePanelNode = (
  params: TranslatePanelNodeParams
) => Promise<Partial<MigrateDashboardState>>;
