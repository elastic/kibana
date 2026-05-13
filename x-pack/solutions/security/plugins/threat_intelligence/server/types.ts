/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginStart,
} from '@kbn/workflows-management-plugin/server';

export interface ThreatIntelligenceSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  features: FeaturesPluginSetup;
  inference?: InferenceServerSetup;
  spaces?: SpacesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface ThreatIntelligenceStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  inference?: InferenceServerStart;
  spaces?: SpacesPluginStart;
  taskManager?: TaskManagerStartContract;
  workflowsManagement?: WorkflowsServerPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginStart {}
