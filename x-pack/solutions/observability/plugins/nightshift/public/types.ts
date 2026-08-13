/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SignificantEventsPublicPluginStart } from '@kbn/significant-events-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface NightshiftSetupDependencies {}

export interface NightshiftStartDependencies {
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  share: SharePluginStart;
  significantEvents: SignificantEventsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  serverless?: ServerlessPluginStart;
  spaces?: SpacesPluginStart;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface NightshiftPublicSetup {}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface NightshiftPublicStart {}
