/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LogsExplorerPluginStart } from '@kbn/logs-explorer-plugin/public';
import type { DiscoverSetup, DiscoverStart } from '@kbn/discover-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type {
  AppMountParameters,
  ScopedHistory,
  AnalyticsServiceStart,
  I18nStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { LogsSharedClientStartExports } from '@kbn/logs-shared-plugin/public';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { SLOPublicStart } from '@kbn/slo-plugin/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { ObservabilityLogsExplorerLocationState } from '@kbn/deeplinks-observability/locators';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogsExplorerPluginStart {}

export interface ObservabilityLogsExplorerSetupDeps {
  discover: DiscoverSetup;
  serverless?: ServerlessPluginStart;
  share: SharePluginSetup;
}

export interface ObservabilityLogsExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
  logsExplorer: LogsExplorerPluginStart;
  logsShared: LogsSharedClientStartExports;
  logsDataAccess: LogsDataAccessPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  slo: SLOPublicStart;
  serverless?: ServerlessPluginStart;
  triggersActionsUi?: TriggersAndActionsUIPublicPluginStart;
  unifiedSearch?: UnifiedSearchPublicPluginStart;
  dataViews?: DataViewsPublicPluginStart;
  dataViewEditor?: DataViewEditorStart;
  lens?: LensPublicStart;
  share: SharePluginStart;
}

export type ObservabilityLogsExplorerHistory =
  ScopedHistory<ObservabilityLogsExplorerLocationState>;
export type ObservabilityLogsExplorerAppMountParameters =
  AppMountParameters<ObservabilityLogsExplorerLocationState>;

export interface ObservabilityLogsExplorerStartServices {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
}
