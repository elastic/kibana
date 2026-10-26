/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertFiringHistory,
  BaselineSummary,
  SignalStrategyId,
  EngineAutoRunState,
  EngineConfig,
  EngineCostLedger,
  EngineProgress,
  EngineRulesState,
  EngineRunSummary,
  LabelledIncident,
  LearningRunSummary,
  MemoryNote,
  MemoryScope,
  StrategyCandidate,
} from '../../common';
import type { CustomerRuleEntity } from './knowledge/customer_rules';
import type { ObservedTopology } from './learning/topology';

/**
 * One evaluation of one series in one bucket, as a strategy reports it. Strategies report every
 * series they evaluate, breaching or not, because the baseline check needs the non-breaching
 * ones too.
 */
export interface StrategyObservation {
  fingerprint: string;
  service: string;
  bucket_start: number;
  value: number;
  unit: string;
  /** The strategy's own trigger. Only these become signals. */
  looks_off: boolean;
  title: string;
  description: string;
  importance: number;
  evidence_esql: string;
  source_id?: string;
  /** The Alerting v2 rule whose output this evaluation came from. */
  rule_id?: string;
  /** When the problem started, if the strategy knows better than the bucket start. */
  since?: string;
  /**
   * Recorded for other checks to read, never a signal on its own; the traffic series that
   * the silence check compares with is one.
   */
  internal?: boolean;
  /**
   * Set on sparse series, which only report minutes above zero. Names the internal series that
   * proves the strategy looked in a minute; the baseline counts those minutes as zeros.
   */
  heartbeat?: string;
  /**
   * Set when this one series runs as a trial while its strategy is live, such as a detector the
   * engine wrote that has not proved itself yet. It records what it would raise, nothing more.
   */
  trial?: boolean;
  /** For customer alerts: how often the alert fired, which the baseline check judges. */
  firing_history?: AlertFiringHistory;
  /**
   * Supporting evidence only. It may join an open event, but never opens one: a warning ratio
   * is a cause rather than a symptom, and one service's silence during a source-wide silence
   * belongs to that silence.
   */
  supporting?: boolean;
  /**
   * The strategy already required persistence, as the silence check does over its own window,
   * so the descriptor's confirmation does not apply again.
   */
  confirmed?: boolean;
}

export interface TaggedObservation extends StrategyObservation {
  strategy: SignalStrategyId;
}

/** A signal that passed the baseline check but waited for agent budget. */
export interface PendingSignal {
  observation: TaggedObservation;
  baseline: BaselineSummary;
  queued_at: string;
  attempts: number;
}

/** An Alerting v2 rule the engine created and owns. */
export interface OwnedRule {
  rule_id: string;
  strategy: SignalStrategyId;
  source_id: string;
  name: string;
  /** Copied from the rule definition; see `DesiredRule.meta`. */
  meta?: Record<string, string>;
}

/** The rules state the engine keeps: the public summary plus the rules it owns. */
export interface EngineRulesRecord extends EngineRulesState {
  owned: OwnedRule[];
}

/** Who holds the space's run lease, and until when. */
export interface RunLease {
  owner: string;
  trigger: EngineRunSummary['trigger'];
  acquired_at: string;
  expires_at: string;
}

/** Every kind of state document, with its shape. */
export interface StateDocs {
  config: EngineConfig;
  progress: EngineProgress;
  last_run: EngineRunSummary;
  /** Memory notes about one series, KI or service, keyed `<scope>:<key>`. */
  memory_notes: { scope: MemoryScope; key: string; notes: MemoryNote[] };
  /** A labelled incident, keyed by its id. */
  incident: LabelledIncident;
  /** A change on the evolution path, keyed by its id. */
  candidate: StrategyCandidate;
  learning_run: LearningRunSummary;
  /** Dependencies the engine observed in the data. */
  topology: ObservedTopology;
  /** Knowledge from one customer rule, keyed by the rule's id: the entity it watches. */
  customer_rule: CustomerRuleEntity;
  cost: EngineCostLedger;
  auto_run: EngineAutoRunState;
  rules: EngineRulesRecord;
  pending: { signals: PendingSignal[] };
  lease: RunLease;
  /** A log pattern a service has logged, keyed `<source>:<service>:<pattern hash>`. */
  seen_pattern: SeenPattern;
}

/**
 * When a service last logged a pattern. A pattern is new only when the store has not seen it
 * for days: a rule that looks back two hours calls every daily job new each time it runs.
 */
export interface SeenPattern {
  source_id: string;
  service: string;
  pattern: string;
  first_seen: string;
  last_seen: string;
}
export type StateKind = keyof StateDocs;

/** Optimistic concurrency token of a stored document. */
export interface DocVersion {
  seq_no: number;
  primary_term: number;
}
