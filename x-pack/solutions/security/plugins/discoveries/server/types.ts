/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-plugin/server';
import type {
  AlertingApiRequestHandlerContext,
  AlertingServerSetup,
} from '@kbn/alerting-plugin/server';
import type { AttackDiscoveryExecutorOptions } from '@kbn/attack-discovery-schedules-common';
import type { CustomRequestHandlerContext } from '@kbn/core/server';
import type { IEventLogService } from '@kbn/event-log-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export type AttackDiscoveryWorkflowExecutorFactory = (
  options: AttackDiscoveryExecutorOptions
) => Promise<{ state: Record<string, never> }>;

/**
 * Minimal contract for the elastic_assistant plugin setup.
 * Defined locally to avoid a direct cross-plugin TypeScript reference.
 */
export interface ElasticAssistantPluginSetup {
  registerAttackDiscoveryWorkflowExecutor: (
    factory: AttackDiscoveryWorkflowExecutorFactory
  ) => void;
}

/** Minimal start contract — extend as capabilities are wired up. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ElasticAssistantPluginStart {}

export interface DiscoveriesPluginSetupDeps {
  actions: ActionsPluginSetup;
  agentBuilder?: AgentBuilderPluginSetup;
  alerting: AlertingServerSetup;
  elasticAssistant?: ElasticAssistantPluginSetup;
  eventLog: IEventLogService;
  ruleRegistry?: RuleRegistryPluginSetupContract;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  /**
   * Workflows management API is only exposed on the workflowsManagement *setup* contract.
   * The workflowsManagement *start* contract is empty.
   *
   * We depend on this (optionally) to run and query workflows from server routes.
   */
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface DiscoveriesPluginStartDeps {
  actions: ActionsPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  elasticAssistant?: ElasticAssistantPluginStart;
  inference?: InferenceServerStart;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

export type DiscoveriesRequestHandlerContext = CustomRequestHandlerContext<{
  alerting: AlertingApiRequestHandlerContext;
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoveriesPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoveriesPluginStart {}
