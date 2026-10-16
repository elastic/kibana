/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AlertingServerStart as AlertingV2ServerStart } from '@kbn/alerting-v2-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { NightshiftSourcesServerStart } from '@kbn/nightshift-sources-plugin/server';
import type { SignificantEventsServerStart } from '@kbn/significant-events-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export interface DetectionEngineSetupDependencies {
  /** Hosts the discovery agent; without it only the heuristic agent runs. */
  agentBuilder?: AgentBuilderPluginSetup;
  /** Owns the managed workflow that schedules the engine. */
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  /** Enables and disables that workflow with the user's credentials. */
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface DetectionEngineStartDependencies {
  significantEvents: SignificantEventsServerStart;
  nightshiftSources: NightshiftSourcesServerStart;
  alertingVTwo: AlertingV2ServerStart;
  inference: InferenceServerStart;
  agentBuilder?: AgentBuilderPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}
