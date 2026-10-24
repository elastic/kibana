/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { PluginSetupContract, PluginStartContract } from '@kbn/actions-plugin/server';
import type { AlertingServerStart } from '@kbn/alerting-v2-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SLOServerStart } from '@kbn/slo-plugin/server';

export interface UxPluginSetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
  taskManager?: TaskManagerSetupContract;
  actions?: PluginSetupContract;
  workflowsManagement?: WorkflowsServerPluginSetup;
  embeddable?: EmbeddableSetup;
}

export interface UxPluginStartDeps {
  agentBuilder?: AgentBuilderPluginStart;
  taskManager?: TaskManagerStartContract;
  actions?: PluginStartContract;
  spaces?: SpacesPluginStart;
  inference?: InferenceServerStart;
  alertingVTwo?: AlertingServerStart;
  slo?: SLOServerStart;
}
