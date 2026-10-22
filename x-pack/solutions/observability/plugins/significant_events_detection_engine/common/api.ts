/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActivityEntry } from './activity';
import type { EngineConfig } from './config';
import type { EngineCostSummary } from './cost';
import type { EngineSignal } from './signals';
import type { EngineEvent } from './events';
import type {
  LabelledIncident,
  KiProposal,
  LearningConfig,
  LearningRunSummary,
  MemoryNote,
  StrategyCandidate,
} from './learning';
import type { EngineProgress, EngineRunSummary } from './runs';
import type {
  SignalStrategyDescriptor,
  SignalStrategyId,
  EngineRulesState,
  StrategyConfig,
  StrategyProposal,
  StrategyRulesState,
  StrategyScorecard,
} from './strategies';

/** The server-side schedule that runs the engine every minute in this space. */
export interface EngineAutoRunState {
  enabled: boolean;
  workflow_id?: string;
  changed_at?: string;
  /** Why the schedule could not be set, when it could not. */
  error?: string;
}

/** One strategy as the page shows it. */
export interface StrategyOverview extends SignalStrategyDescriptor {
  config: StrategyConfig;
  scorecard: StrategyScorecard;
  opened_today: number;
  rules?: StrategyRulesState;
}

export interface EngineOverviewResponse {
  config: EngineConfig;
  strategies: StrategyOverview[];
  proposals: StrategyProposal[];
  last_run?: EngineRunSummary;
  progress: EngineProgress;
  /** How far the slowest live strategy is behind real time, in milliseconds. */
  lag_ms?: number;
  counts: { open_events: number; events: number; signals_last_hour: number };
  cost: EngineCostSummary;
  auto_run: EngineAutoRunState;
  rules: EngineRulesState;
  /** False when Agent Builder is not available; only the heuristic agent can run. */
  agent_builder_available: boolean;
  health: EngineHealth;
}

/**
 * Whether the engine itself is working. No events must never read as "nothing is wrong" when
 * the engine stopped running, fell behind, or keeps failing.
 */
export interface EngineHealth {
  status: 'healthy' | 'degraded' | 'stalled' | 'off';
  reasons: string[];
}

/** Everything the learning loop knows and is doing in this space. */
export interface LearningOverviewResponse {
  config: LearningConfig;
  last_run?: LearningRunSummary;
  candidates: StrategyCandidate[];
  incidents: LabelledIncident[];
  memory: MemoryNote[];
  /** Proposals about the customer's KIs, from how they matched over the last day. */
  ki_proposals: KiProposal[];
}

export interface ServiceSummary {
  service: string;
  watched_by: Array<{ strategy: SignalStrategyId; series: number }>;
  signals_last_hour: number;
  open_events: number;
  last_event_title?: string;
  last_event_id?: string;
}

/** A service relationship from knowledge: `source` calls `target`. */
export interface ServiceDependency {
  source: string;
  target: string;
}

/** The services the engine watches, and who calls whom among them. */
export interface EngineServicesResponse {
  services: ServiceSummary[];
  dependencies: ServiceDependency[];
}

/** A page of a list, newest first. Pass `next_cursor` back to read the next page. */
export interface EnginePage<TItem> {
  items: TItem[];
  next_cursor?: string;
}

export interface EngineEventDetailsResponse {
  event: EngineEvent;
  signals: EngineSignal[];
  activity: ActivityEntry[];
}

/** What a signal's evidence query returns right now, so a person can read the rows. */
export interface EventEvidenceResponse {
  fingerprint: string;
  query: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  took_ms: number;
  /** Set when the query failed; the rows are then empty. */
  error?: string;
}

/** One measured minute of a signal. */
export interface SeriesSample {
  bucket_start: string;
  value: number;
}

/** Each signal's measured values around an event, to draw them against normal. */
export interface EventSeriesResponse {
  from: string;
  to: string;
  series: Array<{ fingerprint: string; samples: SeriesSample[] }>;
}

/** Result of replaying strategies over past buckets. */
export interface ReplaySummary {
  from: string;
  to: string;
  strategies: Array<{
    strategy: SignalStrategyId;
    observations: number;
    looked_off: number;
    above_normal: number;
    /** Distinct runs of consecutive above-normal buckets: roughly the events it would open. */
    would_open: number;
    error?: string;
  }>;
}
