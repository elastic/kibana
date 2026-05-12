/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export interface ThreatIntelligenceSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  taskManager?: TaskManagerSetupContract;
}

export interface ThreatIntelligenceStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  taskManager?: TaskManagerStartContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginStart {}
