/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, CustomRequestHandlerContext } from '@kbn/core/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgenticInvestigationsPluginSetup,
  AgenticInvestigationsPluginStart,
} from '@kbn/agentic-investigations-plugin/server';
import type { ProposalsPluginSetup, ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { SubscriptionAvailability } from '../common/availability';

export type AlertZeroRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alertzero: { subscription: SubscriptionAvailability; hasRequiredDependencies: boolean };
}>;

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
  }): Promise<{ ruleIds: string[]; attachedRuleIds: string[]; skippedRuleCount?: number }>;
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
 * (e.g. security_solution threat-intel supply) can gate on `isEnabled` without
 * reading `xpack.alertzero` config themselves.
 */
export interface AlertZeroPluginSetup {
  setServerlessTierAvailable: (available: boolean) => void;
  /**
   * `false` when the `xpack.alertzero.enabled` kill switch is off, in which case AlertZero
   * registered nothing — including its `securitySolution:enableAlertZero` advanced setting.
   * Serverless checks this before allowlisting that setting: allowlisting an unregistered key
   * fails startup in dev (`UiSettingsService#validateAllowlist`).
   */
  isEnabled: boolean;
}
export interface AlertZeroPluginStart {
  /**
   * Lets an optional consumer that already depends on this plugin (e.g. security_solution, via
   * the `isEnabled` soft-flag above) hand this plugin its Alert Triage rule-attachment service
   * from within the consumer's own `start()`. This is a push, not a pull: this plugin declaring
   * a reverse dependency on that consumer instead would make the two plugins depend on each
   * other, which fails Kibana's plugin boot with a circular-dependency error.
   */
  registerAlertTriageAttachmentServiceProvider: (
    provider: AlertTriageAttachmentServiceProvider
  ) => void;
  /**
   * Whether the Alert Triage Worker is enabled in the request's space. False when AlertZero is
   * off for the space or has not started, so callers can treat it as "nothing to turn off".
   * Rejects when the state cannot be read, so callers must not treat that as "off". Reports the
   * state regardless of the caller's AlertZero privileges; it exposes only this boolean.
   */
  isAlertTriageWorkerEnabled: (request: KibanaRequest) => Promise<boolean>;
  /**
   * Turns the Alert Triage Worker off (detaching it from rules) for a caller whose own action
   * invalidates it, e.g. turning off alert analysis. The caller must hold the privileges the
   * Workers update route requires, since this bypasses that route. `disabled` is true when the
   * Worker is off afterwards, including when it already was, and false when it is still on
   * because the caller lacks privileges or the update failed.
   */
  disableAlertTriageWorker: (request: KibanaRequest) => Promise<{ disabled: boolean }>;
}

export interface AlertZeroSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  agentBuilder?: AgentBuilderPluginSetup;
  agenticInvestigations?: AgenticInvestigationsPluginSetup;
  proposals?: ProposalsPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
}

export interface AlertZeroStartDependencies {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  agentBuilder?: AgentBuilderPluginStart;
  agenticInvestigations?: AgenticInvestigationsPluginStart;
  proposals?: ProposalsPluginStart;
  /**
   * Optional, matching the plugin manifest. Requiring it would take the whole
   * plugin down with it, including the index-scope, Tier 1 and candidates routes
   * that need no model at all. Absence is handled at the Tier 2 boundary
   * instead: `resolveScopedModel` reports `no_inference_plugin`, the coordinator
   * degrades to Tier 1, and the standalone Tier 2 route answers 503.
   */
  inference?: InferenceServerStart;
  /**
   * Optional, matching the plugin manifest. Setup registers the AlertZero model
   * tiers through it; start needs it again so hunt routes can resolve the
   * connector an operator picked for a tier.
   */
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  /**
   * Optional, matching the plugin manifest. Resolves a hunted host's Fleet
   * enrollment so package_report can fill a respond action's endpoint_ids.
   * Absence degrades every host to unenrolled, same as no agent found.
   */
  fleet?: FleetStartContract;
}

export type AlertZeroRouter = IRouter<AlertZeroRequestHandlerContext>;
export type AlertZeroSpaceIdResolver = (request: KibanaRequest) => string;
