/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { NightshiftInvestigationsPublicStart } from '@kbn/nightshift-investigations-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { SignificantEventsPublicPluginStart } from '@kbn/significant-events-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { StreamsPluginStart } from '@kbn/streams-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { EmbeddableSlackAppCardProps } from './components/slack_app_card';

export interface SignificantEventsAppSetupDependencies {
  share: SharePluginSetup;
}

export interface SignificantEventsAppStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  charts: ChartsPluginStart;
  cloud?: CloudStart;
  cps?: CPSPluginStart;
  data: DataPublicPluginStart;
  inference: InferencePublicStart;
  licensing: LicensingPluginStart;
  nightshiftInvestigations?: NightshiftInvestigationsPublicStart;
  share: SharePluginStart;
  significantEvents: SignificantEventsPublicPluginStart;
  spaces?: SpacesPluginStart;
  streams: StreamsPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface SignificantEventsAppPublicSetup {}

export interface SignificantEventsAppPublicStart {
  /** The Elastic Slack App card (connect the workspace, manage channels), for other plugins. */
  SlackAppCard: React.FC<EmbeddableSlackAppCardProps>;
}
