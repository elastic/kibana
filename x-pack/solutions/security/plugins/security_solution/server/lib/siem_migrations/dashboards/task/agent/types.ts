/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExperimentalFeatures } from '../../../../../../common';
import type { MigrationComments } from '../../../../../../common/siem_migrations/model/common.gen';
import type { ParsedPanel } from '../../../../../../common/siem_migrations/parsers/types';
import type { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import type { DashboardMigrationsRetriever } from '../retrievers';
import type { EsqlKnowledgeBase } from '../../../common/task/util/esql_knowledge_base';
import type { ChatModel } from '../../../common/task/util/actions_client_chat';
import type { migrateDashboardConfigSchema, migrateDashboardState } from './state';
import type { DashboardMigrationTelemetryClient } from '../dashboard_migrations_telemetry_client';
import type { MigrationResources } from '../../../common/task/retrievers/resource_retriever';

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
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
  experimentalFeatures: ExperimentalFeatures;
}

export interface ParsedOriginalDashboard {
  title: string;
  panels: Array<ParsedPanel>;
}

/** Record of panel descriptions strings indexed by the parsed panel ID */
export type PanelDescriptions = Record<string, string>;

export interface TranslatedPanel {
  /**
   * The index in the panels array, to keep the same order as in the original dashboard.
   * this is probably not necessary since we have already calculated the `position` of each panel, but maintained for consistency
   */
  index: number;
  /* The panel title */
  title: string;
  /* The visualization json */
  data: object;
  /* The individual panel translation result */
  translation_result?: MigrationTranslationResult;
  /* Any comments generated during the panel translation */
  comments: MigrationComments;
  /* If an error happened during the panel translation, it is captured here */
  error?: Error;
}
export type TranslatedPanels = Array<TranslatedPanel>;

export interface TranslatePanelNodeParams {
  parsed_panel: ParsedPanel;
  description: string;
  dashboard_description: string;
  resources: MigrationResources;
  index: number;
}

export type TranslatePanelNode = (
  params: TranslatePanelNodeParams
) => Promise<Partial<MigrateDashboardState>>;
