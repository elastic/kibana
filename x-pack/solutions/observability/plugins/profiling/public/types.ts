/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public/plugin';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';
import type {
  UnifiedSearchPublicPluginStart,
  UnifiedSearchPluginSetup,
} from '@kbn/unified-search-plugin/public';
import type { KqlPluginSetup, KqlPluginStart } from '@kbn/kql/public';

export interface ProfilingPluginPublicSetupDeps {
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  data: DataPublicPluginSetup;
  charts: ChartsPluginSetup;
  share: SharePluginSetup;
  unifiedSearch: UnifiedSearchPluginSetup;
  kql: KqlPluginSetup;
}

export interface ProfilingPluginPublicStartDeps {
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  share: SharePluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  kql: KqlPluginStart;
  licensing: LicensingPluginStart;
}
