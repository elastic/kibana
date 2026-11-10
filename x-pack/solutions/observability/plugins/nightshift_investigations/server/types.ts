/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type {
  AlertingServerSetup as AlertingV2ServerSetup,
  AlertingServerStart as AlertingV2ServerStart,
} from '@kbn/alerting-v2-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
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
import type { EvalsPluginSetup, EvalsPluginStart } from '@kbn/evals-plugin/server';
import type { NightshiftSourcesServerStart } from '@kbn/nightshift-sources-plugin/server';
import type { SharePluginSetup } from '@kbn/share-plugin/server';
import type { NightshiftInvestigationsClient } from './client/investigations_client';
import type { TriggerEmitter } from './workflows/triggers/emit';

export type InvestigationQuotaTrigger = 'automatic' | 'manual';

/** The daily limit that denied a start: the trigger's own limit, or the one for all investigations. */
export type InvestigationQuotaLimit = InvestigationQuotaTrigger | 'all';

export interface InvestigationQuotaResult {
  allowed: boolean;
  deniedBy?: InvestigationQuotaLimit;
  /** The configured value of the limit that denied the start, when the callback knows it. */
  limit?: number;
  /** Gives back the slot an allowed start took, when the start does not open a new investigation. */
  release?: () => Promise<void>;
}

/** Charges a start that opens a new investigation to the daily limits for its trigger. */
export type InvestigationQuotaCallback = (
  trigger: InvestigationQuotaTrigger
) => Promise<InvestigationQuotaResult>;

export interface AutomationBudget {
  consume: () => Promise<void>;
  release: () => Promise<void>;
}

export interface NightshiftInvestigationsServerSetup {
  registerInvestigationQuota: (callback: InvestigationQuotaCallback) => void;
}

export interface NightshiftInvestigationsServerStart {
  getInvestigationsClient: (request: KibanaRequest) => NightshiftInvestigationsClient;
  isInvestigationAvailable: (request: KibanaRequest) => Promise<boolean>;
  /** Whether the assistant agent is registered, which needs the sandbox. */
  isAssistantEnabled: () => boolean;
}

export interface NightshiftInvestigationsSetupDeps {
  share: SharePluginSetup;
  actions?: ActionsPluginSetup;
  agentBuilder?: AgentBuilderPluginSetup;
  alerting?: AlertingServerSetup;
  alertingVTwo?: AlertingV2ServerSetup;
  /**
   * Stores investigations as conversations. Without it investigations are unavailable.
   */
  agenticInvestigations?: AgenticInvestigationsPluginSetup;
  cloud?: CloudSetup;
  /** Provides the `proposals.create` tool the investigation agent proposes actions with. */
  proposals?: ProposalsPluginSetup;
  contextEngine?: ContextEnginePluginSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
  /** Holds the judges online evals score investigations with. */
  evals?: EvalsPluginSetup;
  sandbox?: SandboxPluginSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface NightshiftInvestigationsStartDeps {
  actions?: ActionsPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  agenticInvestigations?: AgenticInvestigationsPluginStart;
  alertingVTwo?: AlertingV2ServerStart;
  nightshiftSources: NightshiftSourcesServerStart;
  proposals?: ProposalsPluginStart;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginStart;
  /** Scores investigations online. Without it no round is scored. */
  evals?: EvalsPluginStart;
  inference?: InferenceServerStart;
  ruleRegistry?: RuleRegistryPluginStartContract;
  sandbox?: SandboxPluginStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

export type GetTriggerEmitter = (request: KibanaRequest) => TriggerEmitter | undefined;
