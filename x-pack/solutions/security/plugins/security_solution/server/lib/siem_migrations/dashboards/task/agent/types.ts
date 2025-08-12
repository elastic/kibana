/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { DashboardMigrationsRetriever } from '../retrievers';
import type { EsqlKnowledgeBase } from '../../../common/task/util/esql_knowledge_base';
import type { ChatModel } from '../../../common/task/util/actions_client_chat';
import type { migrateDashboardConfigSchema, migrateDashboardState } from './state';
import type { DashboardMigrationTelemetryClient } from '../dashboard_migrations_telemetry_client';

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
  esqlKnowledgeBase: EsqlKnowledgeBase;
  model: ChatModel;
  dashboardMigrationsRetriever: DashboardMigrationsRetriever;
  logger: Logger;
  telemetryClient: DashboardMigrationTelemetryClient;
}

export interface ParsedOriginalPanel {
  id: string;
  title: string;
  description?: string;
  query: string;
  viz_type: VizType;
  position: PanelPosition;
}
export interface ElasticPanel {
  title?: string;
  description?: string;
  query?: string;
}

export interface ParsedOriginalDashboard {
  title: string;
  panels: Array<ParsedOriginalPanel>;
}

export type TranslatedPanels = Array<{
  index: number;
  panel: ElasticPanel;
}>;

export type FailedPanelTranslations = Array<{
  index: number;
  error_message: string;
  details: unknown;
}>;

export type TranslatePanelNode = (params: {
  panel: ParsedOriginalPanel;
  index: number;
}) => Promise<Partial<MigrateDashboardState>>;

export type VizType =
  | 'area_stacked'
  | 'area'
  | 'bar_horizontal_stacked'
  | 'bar_horizontal'
  | 'bar_vertical'
  | 'donut'
  | 'gauge'
  | 'heatmap'
  | 'line'
  | 'markdown'
  | 'metric'
  | 'pie'
  | 'table'
  | 'treemap';

export interface PanelPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}
