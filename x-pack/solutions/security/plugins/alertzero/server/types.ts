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
import type { ProposalsPluginSetup, ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

/**
 * The subset of security_solution's rule-attachment service this plugin actually calls.
 * Kept local and structural rather than importing security_solution's own type, so this
 * plugin has no reference — type or runtime — to security_solution at all; see
 * `AlertTriageAttachmentServiceProvider` for why.
 */
export interface AlertTriageAttachmentService {
  getRuleAttachmentSelection(params: {
    search: string;
    attachmentFilter: 'all' | 'attached' | 'not_attached';
  }): Promise<{ ruleIds: string[]; attachedRuleIds: string[] }>;
  updateRuleAttachments(params: {
    attachRuleIds: string[];
    detachRuleIds: string[];
  }): Promise<unknown>;
}

/**
 * Resolves the Alert Triage rule-attachment service, or `undefined` if no consumer has
 * registered one — e.g. security_solution is disabled, or a request lands before its
 * `start()` has run the registration. Always safe to call: production wires an unconditional
 * function whose *result* may be absent, rather than leaving the function itself undefined.
 */
export type AlertTriageAttachmentServiceProvider = (
  request: KibanaRequest,
  workflowId: string
) => Promise<AlertTriageAttachmentService | undefined>;

/**
 * Soft-enable contract. Always returned from `setup()` so optional consumers
 * (e.g. security_solution threat-intel supply) can gate on `enabled` without
 * reading `xpack.alertzero` config themselves.
 */
export interface AlertZeroPluginSetup {
  enabled: boolean;
}
export interface AlertZeroPluginStart {
  /**
   * Lets an optional consumer that already depends on this plugin (e.g. security_solution, via
   * the `enabled` soft-flag above) hand this plugin its Alert Triage rule-attachment service
   * from within the consumer's own `start()`. This is a push, not a pull: this plugin declaring
   * a reverse dependency on that consumer instead would make the two plugins depend on each
   * other, which fails Kibana's plugin boot with a circular-dependency error.
   */
  registerAlertTriageAttachmentServiceProvider: (
    provider: AlertTriageAttachmentServiceProvider
  ) => void;
}

export interface AlertZeroSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  agentBuilder: AgentBuilderPluginSetup;
  agenticInvestigations: AgenticInvestigationsPluginSetup;
  proposals: ProposalsPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
}

export interface AlertZeroStartDependencies {
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  agentBuilder: AgentBuilderPluginStart;
  agenticInvestigations: AgenticInvestigationsPluginStart;
  proposals: ProposalsPluginStart;
}

export type AlertZeroRouter = IRouter;
export type AlertZeroSpaceIdResolver = (request: KibanaRequest) => string;
