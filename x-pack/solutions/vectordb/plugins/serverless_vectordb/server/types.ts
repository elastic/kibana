/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { ServerlessPluginSetup } from '@kbn/serverless/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessVectordbPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessVectordbPluginStart {}

export interface SetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  cloud?: CloudSetup;
  features: FeaturesPluginSetup;
  serverless: ServerlessPluginSetup;
}

export interface StartDependencies {
  dataViews: DataViewsServerPluginStart;
}
