/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsToolUsage } from '@kbn/nightshift-ai';
import type {
  Severity,
  SignificantEventCloseReason,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type {
  StatusChange,
  StatusOutcome,
} from '../../significant_events/events/lifecycle/lifecycle_controller';
import type { SIGNIFICANT_EVENT_ENTITY_TYPE } from './constants';

interface WorkflowExecutionTelemetryProps {
  workflow_execution_id: string;
}

interface OptionalWorkflowExecutionTelemetryProps {
  workflow_execution_id?: string;
}

interface ParentWorkflowExecutionTelemetryProps {
  parent_workflow_execution_id?: string;
}

interface KnowledgeIndicatorQueriesGeneratedProps
  extends OptionalWorkflowExecutionTelemetryProps,
    ParentWorkflowExecutionTelemetryProps {
  count: number;
  connector_id: string;
  input_tokens_used: number;
  output_tokens_used: number;
  cached_tokens_used: number;
  duration_ms: number;
  source_id: string;
  tool_usage?: SignificantEventsToolUsage;
  external_content_tool_continuations?: number;
}

interface KnowledgeIndicatorFeaturesIdentifiedProps
  extends OptionalWorkflowExecutionTelemetryProps,
    ParentWorkflowExecutionTelemetryProps {
  /** @deprecated Use `workflow_execution_id`. */
  run_id: string;
  connector_id: string;
  iteration: number;
  docs_count: number;
  features_new: number;
  features_updated: number;
  features_remapped: number;
  total_filters: number;
  filters_capped: boolean;
  has_filtered_documents: boolean;
  input_tokens_used: number;
  output_tokens_used: number;
  total_tokens_used: number;
  cached_tokens_used: number;
  duration_ms: number;
  excluded_features_count: number;
  llm_ignored_count: number;
  code_ignored_count: number;
  source_id: string;
  state: 'success' | 'failure' | 'canceled';
}

interface AgentBuilderKnowledgeIndicatorCreatedProps
  extends OptionalWorkflowExecutionTelemetryProps {
  ki_kind: 'feature' | 'query';
  tool_id: 'ki_feature_create' | 'ki_query_create';
  success: boolean;
  source_id: string;
  space_id: string;
  knowledge_indicator_id?: string;
  error_message?: string;
}

interface AgentToolKnowledgeIndicatorIdentificationStartedProps
  extends OptionalWorkflowExecutionTelemetryProps {
  success: boolean;
  source_id: string;
  error_message?: string;
}

/** Identity used to join telemetry to `.rule-events`; a failed operation may have no row. */
interface ExistingAlertIdentityProps {
  alert_source: string;
  fingerprint: string;
  space_id: string;
}

/** `fingerprint` is absent for an unpersisted server-generated id; `group_hash` only on create. */
interface AlertCreationAttemptIdentityProps {
  alert_source: string;
  space_id: string;
  fingerprint?: string;
  group_hash?: string;
}

interface AgentToolEventCreateProps
  extends AlertCreationAttemptIdentityProps,
    OptionalWorkflowExecutionTelemetryProps {
  success: boolean;
  source_ids: string[];
  error_message?: string;
}

interface AgentToolEventStatusUpdateProps
  extends ExistingAlertIdentityProps,
    OptionalWorkflowExecutionTelemetryProps {
  success: boolean;
  /**
   * @deprecated Superseded by `event_id`. Kept optional for schema continuity with events sent by
   * nodes that have not been upgraded yet.
   */
  event_uuid?: string;
  event_id: string;
  status: SignificantEventStatus;
  error_message?: string;
}

/** The entry point that wrote the version, not who was behind it. */
type SignificantEventActor = 'agent_tool' | 'rest_api' | 'stale_event_cleanup';

interface EventStatusChangedProps extends ExistingAlertIdentityProps {
  entity_type: typeof SIGNIFICANT_EVENT_ENTITY_TYPE;
  previous_status?: SignificantEventStatus;
  status: SignificantEventStatus;
  actor: SignificantEventActor;
  change_kind?: StatusChange['kind'];
  assessment_outcome?: StatusOutcome;
  close_reason?: SignificantEventCloseReason;
  severity: Severity;
  confidence: number;
  signal_count: number;
  confirmed_signal_count: number;
  source_ids: string[];
  workflow_execution_id?: string;
}

interface DiscoveryTriggeredProps extends WorkflowExecutionTelemetryProps {
  /** @deprecated Use `workflow_execution_id`. */
  execution_id: string;
  space_id: string;
}

interface DiscoveryRunIdentityProps
  extends WorkflowExecutionTelemetryProps,
    ParentWorkflowExecutionTelemetryProps {
  space_id: string;
  alert_source: string;
}

type DiscoveryStartedProps = DiscoveryRunIdentityProps;

interface DiscoveryCompletedProps extends DiscoveryRunIdentityProps {
  outcome: 'completed' | 'failed' | 'timed_out';
  duration_ms?: number;
  has_work?: boolean;
  budget_denied?: boolean;
  processed_count?: number;
  skipped_count?: number;
  held_back_count?: number;
  needs_agent_count?: number;
  written_rule_count?: number;
  classifier_failed?: boolean;
  error_message?: string;
}

interface DetectionScanProps extends OptionalWorkflowExecutionTelemetryProps {
  /** ES `took` (ms) reported by the alerts-source search itself. */
  took_ms: number;
  /** Wall-clock (ms) around the reader call, including transport and parsing. */
  duration_ms: number;
  /** Rule-backed queries requested for the scan (all analysis profiles). */
  rules_requested: number;
  /** Distinct rules that returned a change-point series bucket. */
  rules_scanned: number;
  /** Rule-backed query count on the critical analysis profile. */
  critical_rule_count: number;
  /** Rule-backed query count on the default analysis profile. */
  default_rule_count: number;
  /** Alerting engine backing the read. */
  alerting_engine: 'v2';
  /** The alerts-source index that was read (e.g. `.rule-events`). */
  alerts_source_index: string;
  /** Critical analysis lookback duration, e.g. `now-40m`. */
  lookback: string;
  /** Critical analysis outer bucket interval, e.g. `1m`. */
  bucket_interval: string;
  /** Default analysis lookback duration, e.g. `now-125m`. */
  default_lookback: string;
  /** Default analysis outer bucket interval, e.g. `5m`. */
  default_bucket_interval: string;
  /** The Kibana space in which the scan ran. */
  space_id: string;
}

interface KnowledgeIndicatorOnboardingScheduledProps extends WorkflowExecutionTelemetryProps {
  source_id: string;
  /** @deprecated Use `workflow_execution_id`. */
  execution_id: string;
  workflow_id: string;
  space_id: string;
  skip_features: boolean;
  skip_queries: boolean;
}

interface AgentToolEventWriteProps
  extends AlertCreationAttemptIdentityProps,
    OptionalWorkflowExecutionTelemetryProps {
  success: boolean;
  event_id: string;
  /** Absent when no status was decided for the item (it was rejected or skipped earlier). */
  status?: SignificantEventStatus;
  written: boolean;
  source_ids: string[];
  detection_workflow_execution_ids?: string[];
  error_message?: string;
  /** Tier actually stored. Present only when written is true. */
  severity?: Severity;
}

interface AgentToolEventSearchProps extends OptionalWorkflowExecutionTelemetryProps {
  success: boolean;
  result_count: number;
  has_query: boolean;
  has_source_filter: boolean;
  status_filter?: SignificantEventStatus;
  view: 'compact' | 'full';
  page: number;
  error_message?: string;
}

export {
  type AlertCreationAttemptIdentityProps,
  type ExistingAlertIdentityProps,
  type AgentBuilderKnowledgeIndicatorCreatedProps,
  type AgentToolKnowledgeIndicatorIdentificationStartedProps,
  type AgentToolEventCreateProps,
  type AgentToolEventSearchProps,
  type AgentToolEventStatusUpdateProps,
  type AgentToolEventWriteProps,
  type DetectionScanProps,
  type DiscoveryCompletedProps,
  type DiscoveryStartedProps,
  type DiscoveryTriggeredProps,
  type EventStatusChangedProps,
  type SignificantEventActor,
  type KnowledgeIndicatorQueriesGeneratedProps,
  type KnowledgeIndicatorFeaturesIdentifiedProps,
  type KnowledgeIndicatorOnboardingScheduledProps,
  type OptionalWorkflowExecutionTelemetryProps,
  type ParentWorkflowExecutionTelemetryProps,
  type WorkflowExecutionTelemetryProps,
};
