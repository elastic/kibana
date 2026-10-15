/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection engine prototype. Every shape the engine writes, and every response the UI reads,
 * lives here so server and app share one contract.
 */

/** Ids of the detection strategies the prototype ships. */
export const DETECTION_STRATEGY_IDS = [
  'ki_rules',
  'health_checks',
  'customer_alerts',
  'new_log_patterns',
] as const;
export type DetectionStrategyId = (typeof DETECTION_STRATEGY_IDS)[number];

/** Off runs nothing; trial records what it would raise without raising; live raises events. */
export const STRATEGY_MODES = ['off', 'trial', 'live'] as const;
export type StrategyMode = (typeof STRATEGY_MODES)[number];

/** How a strategy's detections go through the baseline check. */
export type BaselinePolicy =
  /** Compare with the series' own stored history. */
  | 'own_history'
  /** The detection is new by definition, so its history counts as zero. */
  | 'implicit_zero'
  /** The customer's own rule already decided; the check is skipped. */
  | 'skip';

/** Static description of a strategy, shown in the UI. */
export interface DetectionStrategyDescriptor {
  id: DetectionStrategyId;
  name: string;
  /** What it watches. */
  watches: string;
  /** When it reports a detection. */
  reportsWhen: string;
  baselinePolicy: BaselinePolicy;
  /**
   * True when the strategy reports only series that look off. A missing series then means
   * healthy; for other strategies it means "not evaluated", which never proves recovery.
   */
  reportsOnlyFiring: boolean;
  /** Replay can run it over past buckets. Customer alerts only exist in the present. */
  supportsReplay: boolean;
}

/** Severity of a significant event, matching Significant Events' own values. */
export const ENGINE_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type EngineSeverity = (typeof ENGINE_SEVERITIES)[number];

/** Event status, matching the live statuses of Alerting v2 episodes. */
export const ENGINE_EVENT_STATUSES = ['active', 'recovering', 'inactive'] as const;
export type EngineEventStatus = (typeof ENGINE_EVENT_STATUSES)[number];

/** Evidence verdicts the agent can report. Same vocabulary as Significant Events signals. */
export const EVIDENCE_VERDICTS = ['confirms', 'refutes', 'inconclusive', 'off_topic'] as const;
export type EvidenceVerdict = (typeof EVIDENCE_VERDICTS)[number];

/** Result of running an evidence query. */
export type EvidenceResult = 'found' | 'empty' | 'error';

/** Outcome of the baseline check. */
export type BaselineDecision = 'above_normal' | 'background' | 'warming_up' | 'skipped';

/** What the pipeline did with one detection. Every detection gets exactly one. */
export const DETECTION_OUTCOMES = [
  'background',
  'warming_up',
  'trial_would_raise',
  'continued',
  'joined',
  'new_event',
  'reopened',
  'held_by_dismissal',
  'capped',
  'refuted',
  'deferred',
] as const;
export type DetectionOutcome = (typeof DETECTION_OUTCOMES)[number];

/** Summary of the history the baseline check compared with. */
export interface BaselineSummary {
  decision: BaselineDecision;
  samples: number;
  /** Samples left out because an event for this series was open at the time. */
  excludedSamples: number;
  median?: number;
  mad?: number;
  threshold?: number;
}

/**
 * The common detection format. Every strategy reports in this shape, and discovery reads only
 * this shape, so a new strategy plugs in without changing discovery.
 */
export interface EngineDetection {
  detection_id: string;
  '@timestamp': string;
  space_id: string;
  run_id: string;
  /** Which strategy found it. */
  strategy: DetectionStrategyId;
  /** Stable identity of the watched series; the same problem always has the same fingerprint. */
  fingerprint: string;
  /** Which service. */
  service: string;
  /** What looks off, in words. */
  title: string;
  description: string;
  /** Since when: the start of the bucket it was found in, or the alert start. */
  since: string;
  bucket_start: string;
  bucket_end: string;
  value: number;
  unit: string;
  /** How important, 0-100, as the strategy rates it. */
  importance: number;
  /** How to check it: a query anyone can re-run to see the evidence. */
  evidence_esql: string;
  source_id?: string;
  baseline: BaselineSummary;
  outcome: DetectionOutcome;
  outcome_reason: string;
  event_id?: string;
}

/** One member detection series of an event. */
export interface EventMember {
  fingerprint: string;
  strategy: DetectionStrategyId;
  service: string;
  title: string;
  latest_detection_id: string;
  value: number;
  peak_value: number;
  threshold?: number;
  unit: string;
  importance: number;
  evidence_esql: string;
  source_id?: string;
  healthy: boolean;
  /** Consecutive buckets in which this member was evaluated and healthy. */
  healthy_streak: number;
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
  trigger: 'opened' | 'closed' | 'manual';
  holds: boolean;
  details: string;
}

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

export type EventCloseReason = 'recovered' | 'operator' | 'dismissed';

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
  origin_strategy: DetectionStrategyId;
  /** How many times this problem opened. A repeat continues the same event. */
  episode: number;
  created_at: string;
  opened_at: string;
  updated_at: string;
  closed_at?: string;
  close_reason?: EventCloseReason;
  /** Time ranges this event was open; their buckets are left out of the members' baselines. */
  open_windows: Array<{ from: string; to?: string }>;
  dismissal?: EventDismissal;
  assessment?: EventAssessment;
  verification?: EventVerification;
  /** Publication as an Alerting v2 alert in `.rule-events`. */
  published?: { at: string; ok: boolean; error?: string };
}

/** Pipeline steps that write to the activity log. */
export const ACTIVITY_STEPS = [
  'strategy',
  'baseline',
  'identity',
  'join',
  'agent',
  'state',
  'cap',
  'trial',
  'verifier',
  'publish',
  'learning',
  'operator',
  'lab',
  'run',
] as const;
export type ActivityStep = (typeof ACTIVITY_STEPS)[number];

/** One entry in the engine activity log: what the engine did and why. */
export interface ActivityEntry {
  '@timestamp': string;
  space_id: string;
  run_id?: string;
  step: ActivityStep;
  action: string;
  message: string;
  strategy?: DetectionStrategyId;
  service?: string;
  detection_id?: string;
  event_id?: string;
  details?: Record<string, unknown>;
}

export type AgentKind = 'heuristic' | 'llm';

export interface StrategyConfig {
  mode: StrategyMode;
  /** Most new events this strategy may open per UTC day. Joins and repeats are not charged. */
  daily_cap: number;
}

/** Engine settings per space. */
export interface EngineConfig {
  strategies: Record<DetectionStrategyId, StrategyConfig>;
  agent: { kind: AgentKind; connector_id?: string };
  baseline: {
    /** Fewer samples than this and the series is still warming up. */
    min_samples: number;
    /** How many past buckets the check reads. */
    history_buckets: number;
    /** Threshold is median + k x scaled MAD. */
    mad_k: number;
  };
  /** Bucket size, in minutes. */
  bucket_minutes: number;
  /** Open events younger than this can receive join proposals. */
  join_window_minutes: number;
  /** Consecutive healthy buckets before a recovering event closes. */
  quiet_period_buckets: number;
  /** A dismissed problem must be this much worse (ratio) before it raises again. */
  worse_margin: number;
  /** Most agent calls in one run; the rest wait for the next run. */
  max_agent_calls_per_run: number;
  /** Also write events to `.rule-events` as Alerting v2 alerts. */
  publish_to_alerting_v2: boolean;
}

/** Per-strategy result of one run. */
export interface StrategyRunSummary {
  strategy: DetectionStrategyId;
  mode: StrategyMode;
  observations: number;
  looked_off: number;
  duration_ms: number;
  error?: string;
}

/** What one engine run did, step by step. */
export interface EngineRunSummary {
  run_id: string;
  started_at: string;
  finished_at: string;
  bucket_start: string;
  bucket_end: string;
  /** Set when the run did nothing, with the reason. */
  skipped?: string;
  strategies: StrategyRunSummary[];
  detections: number;
  baseline: Record<BaselineDecision, number>;
  outcomes: Partial<Record<DetectionOutcome, number>>;
  agent: {
    calls: number;
    cooldown_skips: number;
    rejected_answers: number;
    failures: number;
    /** Model tokens spent in this run, prompt plus completion. */
    tokens: number;
    /** List-price cost of this run's model calls in USD; null when the model has no known price. */
    cost_usd?: number | null;
    /** Price key of the model, such as `anthropic-claude-4.6-sonnet`. */
    model?: string;
  };
  transitions: Array<{ event_id: string; from: EngineEventStatus | 'none'; to: EngineEventStatus }>;
  open_events: number;
}

/** A change the learning loop proposes; a person accepts or ignores it. */
export interface StrategyProposal {
  id: string;
  strategy: DetectionStrategyId;
  change: { mode: StrategyMode };
  title: string;
  evidence: string;
}

/** How a strategy has performed, from recorded outcomes. */
export interface StrategyScorecard {
  strategy: DetectionStrategyId;
  detections: number;
  above_normal: number;
  would_raise_in_trial: number;
  events_opened: number;
  events_dismissed: number;
  verifier_failures: number;
}

export type LabIncidentKind = 'error_spike' | 'latency' | 'silence' | 'new_error';

export interface LabIncident {
  id: string;
  kind: LabIncidentKind;
  service: string;
  started_at: string;
  /** Set for incidents in a scenario timeline; open-ended incidents run until stopped. */
  ended_at?: string;
}

/** One incident in a scenario timeline, in minutes before the scenario's end. */
export interface LabScenarioIncident {
  kind: LabIncidentKind;
  service: string;
  start_minutes_ago: number;
  end_minutes_ago: number;
}

/** Synthetic environment used to try the engine. */
export interface LabState {
  ready: boolean;
  index: string;
  source_id?: string;
  services: string[];
  dependencies: Array<{ source: string; target: string }>;
  incidents: LabIncident[];
  generated_until?: string;
}

export interface EngineOverviewResponse {
  config: EngineConfig;
  strategies: Array<
    DetectionStrategyDescriptor & {
      config: StrategyConfig;
      scorecard: StrategyScorecard;
      opened_today: number;
    }
  >;
  proposals: StrategyProposal[];
  last_run?: EngineRunSummary;
  last_evaluated_bucket_end?: string;
  counts: { open_events: number; events: number; detections_last_hour: number };
  lab: LabState;
  cost: EngineCostSummary;
}

/** Elastic Inference Service list price of one model, in USD per million tokens. */
export interface ModelPricePerMillion {
  model: string;
  input: number;
  output: number;
  cache_read: number | null;
}

/** Running total of what the engine's model calls cost. */
export interface EngineCostLedger {
  since: string;
  total_usd: number;
  calls: number;
  prompt_tokens: number;
  cached_tokens: number;
  completion_tokens: number;
  /** Tokens spent on a model with no known price; their cost is not in the total. */
  unpriced_tokens: number;
  by_day: Record<string, { usd: number; tokens: number; calls: number }>;
  by_model: Record<string, { usd: number; tokens: number; calls: number }>;
}

/** Cost figures the page shows. */
export interface EngineCostSummary {
  ledger: EngineCostLedger;
  today_usd: number;
  /** Price of the model the agent uses now; absent for the heuristic agent. */
  current_price?: ModelPricePerMillion;
  /** False when the price catalog could not be read; costs then stay unpriced. */
  prices_available: boolean;
  prices_fetched_at?: string;
}

export interface ServiceSummary {
  service: string;
  watched_by: Array<{ strategy: DetectionStrategyId; series: number }>;
  detections_last_hour: number;
  open_events: number;
  last_event_title?: string;
}

export interface EngineEventDetailsResponse {
  event: EngineEvent;
  detections: EngineDetection[];
  activity: ActivityEntry[];
}
