/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IEventLogger } from '@kbn/event-log-plugin/server';
import type { AuthenticatedUser } from '@kbn/core/server';
import type { ErrorCategory } from '@kbn/discoveries-schemas';

import { ATTACK_DISCOVERY_EVENT_PROVIDER } from './constants';

const MAX_LENGTH = 1024;

/**
 * Abstract interface for event log index refresh.
 * Avoids coupling to specific plugin data client implementations.
 */
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
  /** Human-readable name of the workflow (optional; written when available for UI display) */
  workflowName?: string;
  workflowRunId: string;
}

export interface WorkflowExecutionsTracking {
  alertRetrieval: WorkflowExecutionTracking[] | null;
  generation: WorkflowExecutionTracking | null;
  validation: WorkflowExecutionTracking | null;
}

/**
 * Pre-execution check result for the diagnostic report.
 */
export interface DiagnosticsPreExecutionCheck {
  check: string;
  message: string;
  passed: boolean;
  severity?: 'critical' | 'warning';
}

/**
 * Workflow integrity snapshot for the diagnostic report.
 */
export interface DiagnosticsWorkflowIntegrity {
  repaired: Array<{ key: string; workflowId: string }>;
  status: 'all_intact' | 'repair_failed' | 'repaired';
  unrepairableErrors: Array<{ error: string; key: string; workflowId: string }>;
}

/**
 * Config summary for the diagnostic report.
 */
export interface DiagnosticsConfig {
  alertRetrievalMode: string;
  alertRetrievalWorkflowCount: number;
  connectorType: string;
  hasCustomValidation: boolean;
}

/**
 * Diagnostic context collected during pre-execution checks.
 * Stored in event.reference JSON so the pipeline_data route can surface it to the UI.
 *
 * Privacy constraint: no alert content, connector secrets, or user data — only metadata
 * and pass/fail status.
 */
export interface DiagnosticsContext {
  config: DiagnosticsConfig;
  preExecutionChecks: DiagnosticsPreExecutionCheck[];
  workflowIntegrity: DiagnosticsWorkflowIntegrity;
}

/**
 * Writes an Attack Discovery event to the Elasticsearch event log.
 * Used to track generation status for the GET /api/attack_discovery/generations endpoint.
 */
/**
 * Summary statistics from the validation + persist pipeline.
 * Stored in event.reference JSON to make them available to the generations API transform.
 */
export interface ValidationSummary {
  duplicatesDroppedCount?: number;
  filterReason?: string;
  generatedCount: number;
  hallucinationsFilteredCount?: number;
  persistedCount: number;
}

export const writeAttackDiscoveryEvent = async ({
  action,
  alertsContextCount,
  authenticatedUser,
  connectorId,
  dataClient,
  diagnosticsContext,
  duration,
  end,
  errorCategory,
  eventLogger,
  eventLogIndex,
  executionUuid,
  failedWorkflowId,
  loadingMessage,
  message,
  newAlerts,
  outcome,
  providedAlerts,
  reason,
  source = 'interactive',
  sourceMetadata,
  spaceId,
  start,
  validationSummary,
  workflowExecutions,
  workflowId,
  workflowRunId,
}: {
  /**
   * The Attack Discovery action (event.action).
   *
   * Examples:
   * - generation-started, generation-succeeded, generation-failed
   * - alert-retrieval-started, alert-retrieval-succeeded, alert-retrieval-failed
   * - generate-step-started, generate-step-succeeded, generate-step-failed
   * - validation-started, validation-succeeded, validation-failed
   */
  action:
    | 'alert-retrieval-started'
    | 'alert-retrieval-succeeded'
    | 'alert-retrieval-failed'
    | 'generate-step-started'
    | 'generate-step-succeeded'
    | 'generate-step-failed'
    | 'generation-started'
    | 'generation-succeeded'
    | 'generation-failed'
    | 'generation-canceled'
    | 'generation-dismissed'
    | 'validation-started'
    | 'validation-succeeded'
    | 'validation-failed';
  /** The number of alerts sent as context to the LLM for the generation */
  alertsContextCount?: number;
  /** The authenticated user generating Attack discoveries */
  authenticatedUser: AuthenticatedUser;
  /** The connector id (event.dataset) for this generation */
  connectorId: string;
  /** This client is used to wait for an event log refresh */
  dataClient: EventLogRefresher | null;
  /**
   * Pre-execution diagnostic context (checks + workflow integrity + config summary).
   * Stored in event.reference JSON so the pipeline_data route can surface it to the UI.
   */
  diagnosticsContext?: DiagnosticsContext;
  /** The duration (event.duration) of a successful generation in nanoseconds */
  duration?: number;
  /** When generation ended (event.end) */
  end?: Date;
  /**
   * Structured error category for failed events. Stored in event.reference JSON
   * so the ES transform can surface it to the client without regex-based classification.
   */
  errorCategory?: ErrorCategory;
  /** Event log writer */
  eventLogger: IEventLogger;
  /** Event log index (to refresh) */
  eventLogIndex: string;
  /** The unique identifier (kibana.alert.rule.execution.uuid) for the generation */
  executionUuid: string;
  /**
   * The workflow ID of the failed workflow (for failed events). Stored in event.reference JSON
   * so the ES transform can surface it to the client.
   */
  failedWorkflowId?: string;
  /** The loading message (kibana.alert.rule.execution.status) logged for the generation */
  loadingMessage?: string;
  /** The root-level message logged for the event */
  message: string;
  /** The number of new Attack discovery alerts generated */
  newAlerts?: number;
  /** The outcome (event.outcome) of the generation i.e.success or failure */
  outcome?: 'success' | 'failure';
  /** event.reason for failed generations */
  reason?: string;
  /** How this generation was triggered. Stored in event.category. Defaults to 'interactive'. */
  source?: AttackDiscoverySource;
  /** Metadata about the triggering source (e.g. rule info for action-triggered runs). Stored in event.reference JSON. */
  sourceMetadata?: SourceMetadata;
  /** The Kibana space ID */
  spaceId: string;
  /** When generation started (event.start) */
  start?: Date;
  /**
   * Validation summary stats (persisted/generated/duplicates/hallucinations counts).
   * Stored in event.reference JSON so the generations API transform can surface them.
   */
  validationSummary?: ValidationSummary;
  /**
   * Workflow execution tracking for manual orchestration.
   *
   * NOTE: This is stored in `event.reference` (JSON) so it can be retrieved
   * without introducing unmapped event log fields.
   */
  workflowExecutions?: WorkflowExecutionsTracking;
  /** The workflow ID (kibana.alert.rule.execution.workflow_id) for this generation */
  workflowId?: string;
  /** The workflow run ID (kibana.alert.rule.execution.workflow_run_id) for this generation */
  workflowRunId?: string;
  /**
   * Pre-provided alert strings for 'provided' alert retrieval mode.
   * Stored in event.reference so the pipeline_data route can surface them
   * during the running state (before step.input is available).
   */
  providedAlerts?: string[];
}) => {
  const alertsCountActive =
    alertsContextCount != null
      ? {
          active: alertsContextCount,
        }
      : undefined;

  const alertsCountsNew =
    newAlerts != null
      ? {
          new: newAlerts,
        }
      : undefined;

  const metrics =
    alertsCountActive != null || alertsCountsNew != null
      ? {
          alert_counts: {
            ...alertsCountActive,
            ...alertsCountsNew,
          },
        }
      : undefined;

  const status = loadingMessage;

  // required because reason is mapped with "ignore_above": 1024, so it won't be returned in the search result if it exceeds this length:
  const trimmedReason =
    reason != null && reason.length > MAX_LENGTH ? reason.substring(0, MAX_LENGTH) : reason;

  const referenceData = {
    ...(diagnosticsContext != null ? { diagnosticsContext } : {}),
    ...(errorCategory != null ? { errorCategory } : {}),
    ...(failedWorkflowId != null ? { failedWorkflowId } : {}),
    ...(providedAlerts != null && providedAlerts.length > 0 ? { providedAlerts } : {}),
    ...(sourceMetadata != null ? { sourceMetadata } : {}),
    ...(validationSummary != null ? { validationSummary } : {}),
    ...(workflowExecutions != null ? workflowExecutions : {}),
  };

  const workflowReference =
    Object.keys(referenceData).length > 0 ? JSON.stringify(referenceData) : undefined;

  const attackDiscoveryEvent = {
    '@timestamp': new Date().toISOString(),
    event: {
      action, // e.g. generation-started, generation-succeeded, generation-failed
      category: [source], // How this generation was triggered
      dataset: connectorId, // The connector id for this generation
      duration, // The duration of a successful generation in nanoseconds
      end: end?.toISOString(), // When generation ended
      id: workflowRunId, // The unique workflow execution ID
      module: workflowId, // The workflow definition ID
      outcome, // The outcome of the generation (success or failure)
      provider: ATTACK_DISCOVERY_EVENT_PROVIDER, // The plugin-registered provider name
      reason: trimmedReason, // for failed generations
      reference: workflowReference, // JSON-encoded workflow execution & source tracking (optional)
      start: start?.toISOString(), // When generation started
    },
    kibana: {
      alert: {
        rule: {
          consumer: 'siem',
          execution: {
            metrics,
            status,
            uuid: executionUuid, // The unique identifier for the generation
            // NOTE: workflow_id and workflow_run_id are NOT included here because they are
            // unmapped fields that cause event log schema warnings. Instead, this workflow
            // tracking information is written to event.module and event.id (see above).
          },
        },
      },
      space_ids: [spaceId], // The Kibana space ID
    },
    message,
    tags: ['securitySolution', 'attackDiscovery'],
    user: {
      name: authenticatedUser.username, // only user.name is supported
    },
  };

  try {
    eventLogger.logEvent(attackDiscoveryEvent);
  } finally {
    await dataClient?.refreshEventLogIndex(eventLogIndex);
  }
};
