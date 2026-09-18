/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgenticInvestigationsPluginSetup,
  AgenticInvestigationsPluginStart,
} from '@kbn/agentic-investigations-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type AlertZeroPluginSetup = Record<string, never>;
export type AlertZeroPluginStart = Record<string, never>;

export interface AlertZeroSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  agentBuilder: AgentBuilderPluginSetup;
  agenticInvestigations: AgenticInvestigationsPluginSetup;
}

export interface AlertZeroStartDependencies {
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  agentBuilder: AgentBuilderPluginStart;
  agenticInvestigations: AgenticInvestigationsPluginStart;
}

export type AlertZeroRouter = IRouter;
export type AlertZeroSpaceIdResolver = (request: KibanaRequest) => string;
