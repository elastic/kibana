/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { SystemSecurityWorkerCatalogEntry } from '@kbn/alertzero-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentService } from '@kbn/fleet-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ActionsService } from '../services/actions/actions_service';

export type WorkerStepDefinition = Parameters<
  WorkflowsExtensionsServerPluginSetup['registerStepDefinition']
>[0];

export interface WorkerFeatureFlag<T extends boolean | string = boolean | string> {
  key: string;
  /** The value until the first flag value arrives, and wherever no flag provider exists. */
  fallback: T;
}

/**
 * Steps register during `setup` and run after `start`, so every service is a getter: required ones
 * throw before `start`; optional ones return `undefined` when the plugin is absent or not started
 * yet.
 */
export interface WorkerServerContext {
  logger: Logger;
  getActionsService: () => ActionsService;
  getConversations: () => AgentBuilderPluginStart['conversations'];
  getProposalsPlugin: () => ProposalsPluginStart;
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
  getMitreDataClient: () => MitreAttackDataClient | undefined;
  getFleetAgentService: () => AgentService | undefined;
  getTaskManager: () => TaskManagerStartContract;
  getWorkflowsManagement: () => WorkflowsServerPluginSetup['management'] | undefined;
  getInternalEsClient: () => ElasticsearchClient;
  /** The space-scoped Context Engine advanced setting, read for the request's own space. */
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  /** The latest value of a declared flag. Throws for a flag no Worker declares. */
  getFeatureFlag: <T extends boolean | string>(flag: WorkerFeatureFlag<T>) => T;
}

export interface WorkerServerDefinition {
  workerId: SystemSecurityWorkerCatalogEntry['id'];
  featureFlags?: readonly WorkerFeatureFlag[];
  /** Called once during `setup`. */
  getStepDefinitions?: (context: WorkerServerContext) => readonly WorkerStepDefinition[];
}
