/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsToolUsage } from '@kbn/nightshift-ai';
import type { Severity, SignificantEventStatus } from '@kbn/significant-events-schema';
import type { SIGNIFICANT_EVENT_ENTITY_TYPE } from './constants';

/** Who caused a Significant Event version to be written. */
type SignificantEventActor = 'agent' | 'human' | 'system';

/**
 * Identity of the alert an event is about, shared by every alert-level EBT event so a metric can be
 * split by `alert_source` and the same alert joined across events by `fingerprint`.
 */
interface AlertIdentityProps {
  /**
   * The `source` on the alert document in `.rule-events`. Significant Events always write
   * `elastic.significant_events`; the field is named `alert_source` so it does not collide with
   * `source_id`/`source_ids`, which identify Nightshift query sources.
   */
  alert_source: string;
  /** The alert `fingerprint`: the Significant Event's stable `event_id`. */
  fingerprint: string;
  /** The Kibana space the alert lives in. */
  space_id: string;
}

interface KnowledgeIndicatorQueriesGeneratedProps {
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

interface KnowledgeIndicatorFeaturesIdentifiedProps {
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

interface AgentBuilderKnowledgeIndicatorCreatedProps {
  ki_kind: 'feature' | 'query';
  tool_id: 'ki_feature_create' | 'ki_query_create';
  success: boolean;
  source_id: string;
  /** The created knowledge indicator's id; absent when creation failed. */
  knowledge_indicator_id?: string;
  error_message?: string;
}

interface AgentToolKnowledgeIndicatorIdentificationStartedProps {
  success: boolean;
  source_id: string;
  error_message?: string;
}

/** The chat agent's `event_create` tool call; `fingerprint` is `unknown` when creation failed. */
interface AgentToolEventCreateProps extends AlertIdentityProps {
  success: boolean;
  source_ids: string[];
  error_message?: string;
}

/** The chat agent's `event_status_update` tool call. */
interface AgentToolEventStatusUpdateProps extends AlertIdentityProps {
  success: boolean;
  /**
   * @deprecated Superseded by `event_id`. Kept optional for schema continuity with events sent by
   * nodes that have not been upgraded yet.
   */
  event_uuid?: string;
  /** Same value as `fingerprint`; kept so existing queries keep working. */
  event_id: string;
  status: SignificantEventStatus;
  error_message?: string;
}

/**
 * One Significant Event version was written and its status is not the one stored before it: the
 * first version (no `previous_status`) or a transition. Emitted on every write path (agent write,
 * operator update, rule-deletion cleanup), so it is the single status-change record per event.
 */
interface EventStatusChangedProps extends AlertIdentityProps {
  entity_type: typeof SIGNIFICANT_EVENT_ENTITY_TYPE;
  /** Status of the latest stored version before this write; absent when this write created the event. */
  previous_status?: SignificantEventStatus;
  status: SignificantEventStatus;
  actor: SignificantEventActor;
  /** Severity tier stored on the written version. */
  severity: Severity;
  /** Confidence stored on the written version (0-1). */
  confidence: number;
  /** Correlation fan-in: signals stored on the written version, one per member rule. */
  signal_count: number;
  /** Signals whose verdict confirms the event. */
  confirmed_signal_count: number;
  source_ids: string[];
  /** The workflow execution that produced this version, when it was written by a workflow. */
  workflow_execution_id?: string;
}

interface DiscoveryTriggeredProps {
  execution_id: string;
  space_id: string;
}

interface DetectionScanProps {
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
  /** The detection workflow execution that requested the scan; absent for a direct call. */
  workflow_execution_id?: string;
}

interface KnowledgeIndicatorOnboardingScheduledProps {
  source_id: string;
  execution_id: string;
  workflow_id: string;
  space_id: string;
  skip_features: boolean;
  skip_queries: boolean;
}

interface AgentToolEventWriteProps extends AlertIdentityProps {
  success: boolean;
  /** Same value as `fingerprint`; kept so existing queries keep working. */
  event_id: string;
  /** Absent when no status was decided for the item (it was rejected or skipped earlier). */
  status?: SignificantEventStatus;
  written: boolean;
  source_ids: string[];
  error_message?: string;
  /** Tier actually stored. Present only when written is true. */
  severity?: Severity;
  /** The discovery workflow execution the agent wrote on behalf of, when it passed one. */
  workflow_execution_id?: string;
}

interface AgentToolEventSearchProps {
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
  type AgentBuilderKnowledgeIndicatorCreatedProps,
  type AgentToolKnowledgeIndicatorIdentificationStartedProps,
  type AgentToolEventCreateProps,
  type AgentToolEventSearchProps,
  type AgentToolEventStatusUpdateProps,
  type AgentToolEventWriteProps,
  type AlertIdentityProps,
  type DetectionScanProps,
  type DiscoveryTriggeredProps,
  type EventStatusChangedProps,
  type KnowledgeIndicatorQueriesGeneratedProps,
  type KnowledgeIndicatorFeaturesIdentifiedProps,
  type KnowledgeIndicatorOnboardingScheduledProps,
  type SignificantEventActor,
};
