/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub barrel: the real event_logging implementation lands in a later PR in
// the stack (PR4 — Orchestration + Event Logging). PR3 needs the *symbols*
// (types + constants + writer fn) exported here so route handlers and
// generation code can type-check with the feature flag OFF. None of these
// stubs are reached at runtime when the FF is OFF — the discoveries plugin
// is FF-gated and never invokes this path.

// ---- Constants (real values defined in PR4 constants.ts) ---------------

export const ATTACK_DISCOVERY_EVENT_PROVIDER = 'securitySolution.attackDiscovery' as const;

export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED =
  'alert-retrieval-started' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED =
  'alert-retrieval-succeeded' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED =
  'alert-retrieval-failed' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED =
  'generate-step-started' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED =
  'generate-step-succeeded' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED =
  'generate-step-failed' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED = 'generation-started' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED =
  'generation-succeeded' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED = 'generation-failed' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED = 'generation-canceled' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED =
  'generation-dismissed' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED = 'validation-started' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED =
  'validation-succeeded' as const;
export const ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED = 'validation-failed' as const;

export const ATTACK_DISCOVERY_EVENT_ACTIONS = [
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED,
];

// ---- Types (mirrored from the PR4 real impl) ---------------------------

export interface EventLogRefresher {
  refreshEventLogIndex(indexPattern: string): Promise<void>;
}

export type AttackDiscoverySource = 'action' | 'interactive' | 'scheduled';

export interface SourceMetadata {
  actionExecutionUuid: string;
  ruleId: string;
  ruleName: string;
}

export interface WorkflowExecutionTracking {
  workflowId: string;
  workflowName?: string;
  workflowRunId: string;
}

export interface WorkflowExecutionsTracking {
  alertRetrieval: WorkflowExecutionTracking[] | null;
  generation: WorkflowExecutionTracking | null;
  validation: WorkflowExecutionTracking | null;
}

export interface DiagnosticsPreExecutionCheck {
  check: string;
  message: string;
  passed: boolean;
  severity?: 'critical' | 'warning';
}

export interface DiagnosticsWorkflowIntegrity {
  repaired: Array<{ key: string; workflowId: string }>;
  status: 'all_intact' | 'repair_failed' | 'repaired';
  unrepairableErrors: Array<{ error: string; key: string; workflowId: string }>;
}

export interface DiagnosticsConfig {
  alertRetrievalMode: string;
  alertRetrievalWorkflowCount: number;
  connectorType: string;
  hasCustomValidation: boolean;
}

export interface DiagnosticsContext {
  config: DiagnosticsConfig;
  preExecutionChecks: DiagnosticsPreExecutionCheck[];
  workflowIntegrity: DiagnosticsWorkflowIntegrity;
}

export interface ValidationSummary {
  duplicatesDroppedCount?: number;
  filterReason?: string;
  generatedCount: number;
  hallucinationsFilteredCount?: number;
  persistedCount: number;
}

// ---- Writer (no-op stub; real impl added in PR4) -----------------------

// The signature accepts `unknown` so call sites compile without coupling to
// internal types here. When the FF is OFF, this writer is never invoked.
export const writeAttackDiscoveryEvent = async (_params: unknown): Promise<void> => {
  // Intentionally empty. Real implementation lives in PR4's
  // event_logging/write_attack_discovery_event.ts.
};
