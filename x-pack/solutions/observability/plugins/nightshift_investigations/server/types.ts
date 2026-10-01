/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { SandboxPluginSetup, SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  AgenticInvestigationsPluginSetup,
  AgenticInvestigationsPluginStart,
} from '@kbn/agentic-investigations-plugin/server';
import type { ProposalsPluginSetup, ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { NightshiftInvestigationsClient } from './client/investigations_client';
import type { DeleteAllInvestigationsResult } from './lib/delete_all_investigations';
import type { TriggerEmitter } from './workflows/triggers/emit';

export interface InvestigationQuotaResult {
  allowed: boolean;
}

export type InvestigationQuotaCallback = () => Promise<InvestigationQuotaResult>;

export interface NightshiftInvestigationsServerSetup {
  registerInvestigationQuota: (callback: InvestigationQuotaCallback) => void;
}

export interface NightshiftInvestigationsServerStart {
  getInvestigationsClient: (request: KibanaRequest) => NightshiftInvestigationsClient;
  isInvestigationAvailable: (request: KibanaRequest) => Promise<boolean>;
  /**
   * Deletes the shared investigation data of investigations in every space (not the Agent Builder
   * conversations); callers must authorize this destructive operation.
   */
  deleteAllInvestigations: () => Promise<DeleteAllInvestigationsResult>;
}

export interface NightshiftInvestigationsSetupDeps {
  agentBuilder?: AgentBuilderPluginSetup;
  /**
   * Stores investigations as conversations. Registers the investigation workflow as a driver
   * workflow so its runs count as in progress. Without it investigations are unavailable.
   */
  agenticInvestigations?: AgenticInvestigationsPluginSetup;
  /** Provides the `proposals.create` tool the investigation agent proposes actions with. */
  proposals?: ProposalsPluginSetup;
  contextEngine?: ContextEnginePluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  sandbox?: SandboxPluginSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface NightshiftInvestigationsStartDeps {
  actions?: ActionsPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  agenticInvestigations?: AgenticInvestigationsPluginStart;
  proposals?: ProposalsPluginStart;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  inference?: InferenceServerStart;
  ruleRegistry?: RuleRegistryPluginStartContract;
  sandbox?: SandboxPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

export type GetTriggerEmitter = (request: KibanaRequest) => TriggerEmitter | undefined;
