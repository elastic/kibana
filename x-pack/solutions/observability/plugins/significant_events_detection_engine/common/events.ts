/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalStrategyId } from './strategies';

/** Severity of a significant event, matching Significant Events' own values. */
export const ENGINE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type EngineSeverity = (typeof ENGINE_SEVERITIES)[number];

/** Event status, matching the live statuses of Alerting v2 episodes. */
export const ENGINE_EVENT_STATUSES = ['active', 'recovering', 'inactive'] as const;
export type EngineEventStatus = (typeof ENGINE_EVENT_STATUSES)[number];

/** Statuses of an event that is still open. */
export const OPEN_EVENT_STATUSES: readonly EngineEventStatus[] = ['active', 'recovering'];

/** Evidence verdicts the agent can report. Same vocabulary as Significant Events signals. */
export const EVIDENCE_VERDICTS = ['confirms', 'refutes', 'inconclusive', 'off_topic'] as const;
export type EvidenceVerdict = (typeof EVIDENCE_VERDICTS)[number];

/** Result of running an evidence query. */
export type EvidenceResult = 'found' | 'empty' | 'error';

/** Which agent judged an event. */
export type AgentKind = 'heuristic' | 'agent_builder';

/** One member signal series of an event. */
export interface EventMember {
  fingerprint: string;
  strategy: SignalStrategyId;
  service: string;
  title: string;
  latest_signal_id: string;
  value: number;
  peak_value: number;
  threshold?: number;
  unit: string;
  importance: number;
  evidence_esql: string;
  source_id?: string;
  healthy: boolean;
  /** Consecutive evaluated buckets in which this member was healthy. */
  healthy_streak: number;
  /** Last bucket this member's series was evaluated in; health never advances twice per bucket. */
  last_evaluated_bucket?: string;
  first_seen: string;
  last_seen: string;
  joined_at: string;
  join_reason: string;
  verdict?: EvidenceVerdict;
  evidence_result?: EvidenceResult;
}

/** Per-evidence verdict recorded from the agent. */
export interface AssessmentVerdict {
  evidence_id: string;
  fingerprint: string;
  verdict: EvidenceVerdict;
  note: string;
}

/** The agent's latest assessment, after validation in code. */
export interface EventAssessment {
  agent: AgentKind;
  connector_id?: string;
  at: string;
  explanation: string;
  verdicts: AssessmentVerdict[];
  proposed_severity: EngineSeverity;
  /** Set when code changed the agent's severity, with the reason. */
  severity_guard?: string;
}

/** Result of re-running an event's evidence after it opened or closed. */
export interface EventVerification {
  at: string;
  /** `recheck`: an open event whose evidence did not hold, checked again. */
  trigger: 'opened' | 'recheck' | 'closed' | 'manual';
  holds: boolean;
  details: string;
}

/** Dismissal reasons, the same list the platform's proposals use. */
export const DISMISSAL_REASONS = [
  'false_positive',
  'expected_behavior',
  'duplicate',
  'not_actionable',
] as const;
export type DismissalReason = (typeof DISMISSAL_REASONS)[number];

export interface EventDismissal {
  reason: DismissalReason;
  note?: string;
  at: string;
  /** Member values when dismissed. The hold lifts only when the problem gets worse than this. */
  values: Record<string, number>;
}

/** `evidence_gone`: the Verifier re-ran the evidence twice and nothing showed the problem. */
export type EventCloseReason =
  | 'recovered'
  | 'operator'
  | 'dismissed'
  | 'evidence_gone'
  /** Every source its signals came from was disabled or removed, so nothing can evaluate it. */
  | 'source_removed';

/**
 * One time an event was open. `from` is data time, the first minute that was above normal; the
 * other times are wall-clock, so the gap between them is how fast the engine reacted.
 */
export interface EventOpenWindow {
  from: string;
  to?: string;
  /** When the engine raised it. Missing on windows stored before this was recorded. */
  raised_at?: string;
  /** When the run that raised it started. The time before it is spent waiting for data. */
  run_started_at?: string;
  /** When it was first handed off as an Alerting v2 alert. */
  published_at?: string;
}

/** A significant event as the engine stores it: current state, updated in place. */
export interface EngineEvent {
  event_id: string;
  space_id: string;
  title: string;
  summary: string;
  severity: EngineSeverity;
  status: EngineEventStatus;
  services: string[];
  members: EventMember[];
  /** Strategy charged for the daily cap; fixed when the event first opens. */
  origin_strategy: SignalStrategyId;
  /** How many times this problem opened. A repeat continues the same event. */
  episode: number;
  created_at: string;
  opened_at: string;
  updated_at: string;
  closed_at?: string;
  close_reason?: EventCloseReason;
  /** Time ranges this event was open; their buckets are left out of the members' baselines. */
  open_windows: EventOpenWindow[];
  dismissal?: EventDismissal;
  assessment?: EventAssessment;
  verification?: EventVerification;
  /**
   * Episodes a person confirmed as a real problem, each a labelled incident. An event can be
   * confirmed once per episode: each repeat is its own case.
   */
  confirmations?: Array<{ episode: number; at: string; note?: string; incident_id: string }>;
  /** Publication as an Alerting v2 alert in `.rule-events`. */
  published?: { at: string; ok: boolean; error?: string; pending?: boolean };
}
