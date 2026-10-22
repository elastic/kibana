/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalStrategyId, StrategyMode } from './strategies';

/** How far the engine may go on its own, per capability. */
export const AUTONOMY_LEVELS = ['off', 'suggest', 'act'] as const;
export type AutonomyLevel = (typeof AUTONOMY_LEVELS)[number];

/**
 * What the learning loop can change. Memory only informs the AI; tuning and detectors are
 * engine-owned and go through the evolution path. Customer-owned objects are never here: they
 * only ever get proposals.
 */
export const LEARNING_CAPABILITIES = ['memory', 'tuning', 'detectors'] as const;
export type LearningCapability = (typeof LEARNING_CAPABILITIES)[number];

/**
 * Labelled cases. Only confirmed evidence becomes one: a person's action, a finished
 * investigation or the Verifier. The AI's own verdicts never do.
 */
export const INCIDENT_LABELS = ['confirmed', 'missed', 'false_positive'] as const;
export type IncidentLabel = (typeof INCIDENT_LABELS)[number];

export const INCIDENT_ORIGINS = ['operator', 'investigation', 'verifier'] as const;
export type IncidentOrigin = (typeof INCIDENT_ORIGINS)[number];

/** A kept case: every future change to the engine is checked against these. */
export interface LabelledIncident {
  incident_id: string;
  label: IncidentLabel;
  /** Services where the problem was; the first is where it started, when known. */
  services: string[];
  /** Data time the problem started and ended. */
  from: string;
  to?: string;
  description: string;
  origin: IncidentOrigin;
  /** The event the label came from, for confirmed and false-positive labels. */
  event_id?: string;
  /** The series of that event, so a later replay can tell which signals it covers. */
  fingerprints: string[];
  /** Strategies whose signals were in the event. */
  strategies: SignalStrategyId[];
  /** For a confirmed label, how many minutes after `from` the engine raised it. */
  warning_minutes?: number;
  created_at: string;
}

/** What a memory note is about: one series, one KI on any service, or one service. */
export const MEMORY_SCOPES = ['series', 'ki', 'service'] as const;
export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export const MEMORY_NOTE_KINDS = [
  'dismissal',
  'confirmed',
  'verifier',
  'harmless_match',
  'investigation',
] as const;
export type MemoryNoteKind = (typeof MEMORY_NOTE_KINDS)[number];

/**
 * One note the agent reads next to a case. Notes only inform the AI; code never decides on
 * them. Each is kept with its evidence and can be retired, never silently edited.
 */
export interface MemoryNote {
  note_id: string;
  scope: MemoryScope;
  /** Fingerprint, KI id or service name. */
  key: string;
  kind: MemoryNoteKind;
  text: string;
  /** Where it came from: an event, a label or an investigation page. */
  evidence: string;
  at: string;
  retired_at?: string;
  retired_reason?: string;
}

/** What a candidate changes. */
export const CANDIDATE_KINDS = ['detector', 'threshold'] as const;
export type CandidateKind = (typeof CANDIDATE_KINDS)[number];

/**
 * Where a candidate is on the evolution path. `proposed` waits for its replay or for its scope
 * to be free; `review` waits for a person; `kept` passed its watch period. `replay_failed`,
 * `rolled_back` and `rejected` are kept so the loop never proposes the same change again.
 */
export const CANDIDATE_STAGES = [
  'proposed',
  'replay_failed',
  'trial',
  'review',
  'live',
  'kept',
  'rolled_back',
  'rejected',
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

/** Stages in which a candidate's detector runs, and whether it raises. */
export const CANDIDATE_RUNNING_STAGES: Readonly<Partial<Record<CandidateStage, StrategyMode>>> = {
  trial: 'trial',
  review: 'trial',
  live: 'live',
  kept: 'live',
};

/** Where a candidate came from. */
export type CandidateOrigin =
  | {
      kind: 'decision_tree';
      tree_id: string;
      /** End node the investigations' confirmed path leads to. */
      cause: string;
      /** Labels of the checks on that path, in order. */
      path: string[];
      /** How many reinforcement turns (finished investigations) confirmed this path. */
      confirmations: number;
    }
  | { kind: 'missed_incident'; incident_id: string; pattern: string }
  | { kind: 'dismissals'; event_ids: string[] }
  | { kind: 'person' };

/**
 * The bar a candidate must pass, set when it is created. The learning loop never lowers it;
 * a candidate that fails is kept as a failed attempt.
 */
export interface AcceptanceCriteria {
  /** Kept incidents the change must catch on replay. */
  must_catch: string[];
  /** A caught incident must be raised within this many minutes of its start. */
  max_warning_minutes: number;
  /** Events the change would open outside every labelled incident, per day. */
  max_false_opens_per_day: number;
  /** How long the trial runs on live data before it is judged. */
  min_trial_minutes: number;
  /** Dismissals while live or watched that roll the change back on their own. */
  rollback_dismissals: number;
  /** How long a live change is watched before it is kept. */
  watch_minutes: number;
}

/** A detector the engine wrote: a log condition counted per minute on one service. */
export interface LearnedDetector {
  detector_id: string;
  title: string;
  description: string;
  service: string;
  source_id: string;
  /** ES|QL boolean expression over the source, without the service filter. */
  condition: string;
  importance: number;
}

/** A per-series threshold change: the baseline uses this `mad_k` for matching series. */
export interface ThresholdChange {
  /** Fingerprints the change applies to. */
  fingerprints: string[];
  /** Unit of those series, which sets the smallest change the baseline counts. */
  unit: string;
  from_mad_k: number;
  to_mad_k: number;
}

/** What the replay of a candidate over past data showed. */
export interface CandidateReplay {
  from: string;
  to: string;
  at: string;
  /** Distinct runs of above-normal minutes: the events it would have opened. */
  would_open: number;
  caught: Array<{ incident_id: string; warning_minutes: number }>;
  missed: string[];
  /** Opens outside every labelled incident window. */
  false_opens: number;
  false_opens_per_day: number;
  /** Opens that overlapped an incident a person had dismissed. */
  dismissed_opens: number;
  passed: boolean;
  reasons: string[];
  error?: string;
}

/** What the trial on live data showed. */
export interface CandidateTrial {
  started_at: string;
  judged_at?: string;
  would_raise: number;
  /** Distinct runs of would-raise minutes. */
  would_open: number;
  caught: string[];
  false_opens: number;
  passed?: boolean;
  reasons: string[];
}

/** One step a candidate took, kept with its reason. */
export interface CandidateHistoryEntry {
  at: string;
  stage: CandidateStage;
  note: string;
  /** Who moved it: the learning loop or a person. */
  by: 'engine' | 'person';
}

/** A change on the evolution path, whoever created it. */
export interface StrategyCandidate {
  candidate_id: string;
  kind: CandidateKind;
  /** Same signature, same change: a failed one is never proposed again. */
  signature: string;
  title: string;
  /** What the change is expected to do, in words. */
  hypothesis: string;
  /** One change at a time per scope. */
  scope: { service: string; source_id?: string; strategy: SignalStrategyId };
  origin: CandidateOrigin;
  stage: CandidateStage;
  created_at: string;
  updated_at: string;
  acceptance: AcceptanceCriteria;
  detector?: LearnedDetector;
  threshold?: ThresholdChange;
  replay?: CandidateReplay;
  trial?: CandidateTrial;
  live?: { since: string; events_opened: number; dismissed: number; verifier_failures: number };
  history: CandidateHistoryEntry[];
}

/**
 * A proposal about a customer-owned KI. The engine never changes the KI; a person decides.
 * `always_matches` describes normal behaviour, so it says nothing about problems and keeps
 * events open; `never_matches` watches something that does not happen, or no longer parses.
 */
export interface KiProposal {
  ki_id: string;
  source_id: string;
  title: string;
  kind: 'always_matches' | 'never_matches';
  /** Minutes the KI was counted in, and how many of them it matched. */
  minutes: number;
  matched_minutes: number;
  proposal: string;
}

/** What one pass of the learning loop did. */
export interface LearningRunSummary {
  run_id: string;
  trigger: 'schedule' | 'manual';
  started_at: string;
  finished_at: string;
  evidence: {
    incidents: number;
    dismissed_events: number;
    verifier_failures: number;
    decision_trees: number;
    investigation_pages: number;
  };
  memory: { added: number; retired: number };
  candidates: { proposed: number; advanced: number; failed: number };
  /** Model calls the loop made to write detector conditions. */
  model_calls: number;
  notes: string[];
  error?: string;
}

/** The learning part of the engine settings. */
export interface LearningConfig {
  autonomy: Record<LearningCapability, AutonomyLevel>;
  /** Minutes between learning passes; the schedule runs it after a detection run. */
  interval_minutes: number;
  /** Defaults for the bar of new candidates. */
  acceptance: Omit<AcceptanceCriteria, 'must_catch'>;
  /** How far back a candidate is replayed. */
  replay_hours: number;
  /** Most model calls per learning pass to write detector conditions. */
  max_model_calls_per_pass: number;
}
