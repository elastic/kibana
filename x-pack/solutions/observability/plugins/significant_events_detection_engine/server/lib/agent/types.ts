/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentKind,
  SignalStrategyId,
  EngineEventStatus,
  EngineSeverity,
  EvidenceResult,
  EvidenceVerdict,
} from '../../../common';
import type { EsqlRow } from '../esql';
import type { IOpenEventSearch } from './open_event_search';

/** One piece of evidence, with an id the agent must cite. */
export interface CaseEvidence {
  id: string;
  /**
   * In a reopen case, the closed event's own evidence: rows from its earlier episode, which say
   * what that problem was, not what is happening now.
   */
  earlier_episode?: boolean;
  fingerprint: string;
  title: string;
  unit: string;
  query: string;
  result: EvidenceResult;
  rows: EsqlRow[];
  error?: string;
}

export interface CaseSignal {
  fingerprint: string;
  strategy: SignalStrategyId;
  service: string;
  /** The source the signal came from, by title: services in different sources are different systems. */
  source?: string;
  title: string;
  description: string;
  value: number;
  unit: string;
  threshold?: number;
  importance: number;
}

/**
 * The bounded case code prepares for the agent. The agent reads only this; it cannot query
 * anything else, and an answer citing evidence the case does not hold is rejected.
 */
export interface AgentCase {
  /**
   * New: no event exists. Join: code proposes an open event. Reopen: a closed event's series is
   * firing again; the agent decides whether it is the same problem or a different one.
   */
  kind: 'new_event' | 'join' | 'reopen';
  signal: CaseSignal;
  event?: {
    event_id: string;
    title: string;
    summary: string;
    severity: EngineSeverity;
    status: EngineEventStatus;
    services: string[];
    members: Array<{
      title: string;
      service: string;
      source?: string;
      strategy: SignalStrategyId;
      importance: number;
      /** What the member measures, such as `ms` for latency: the kind of symptom it is. */
      unit: string;
    }>;
  };
  join_proposal?: {
    event_id: string;
    reason: string;
    relation: string;
    /** The service linking them; for a shared dependency, the one both call. */
    via: string;
    minutes_apart: number;
    /** For a dependency relation: a call seen in the logs, or a shared request path. */
    dependency_kind?: string;
  };
  evidence: CaseEvidence[];
  firing_customer_alerts: Array<{ title: string; service: string }>;
  related_services: string[];
  /** Notes the learning loop kept for these series, KIs and services, such as past dismissals. */
  memory: string[];
  /**
   * Pages investigations wrote about these services (Semantic Memory, Cortex). Written by an AI
   * with no review: context to weigh, never proof.
   */
  investigation_context: Array<{ kind: 'semantic_memory' | 'cortex'; title: string; text: string }>;
}

/** The one shape the agent answers in. It reports facts and judgments, never a status. */
export interface AgentAnswer {
  /**
   * The open event the signal joins, the proposed one or one the agent found; in a reopen case,
   * the closed event when this is its problem coming back.
   */
  join_event_id?: string;
  join_reason?: string;
  verdicts: Array<{ evidence_id: string; verdict: EvidenceVerdict; note: string }>;
  severity: EngineSeverity;
  title: string;
  summary: string;
}

/** Tokens a model call used. `cached` is part of `prompt`; thinking counts as completion. */
export interface AgentUsage {
  prompt: number;
  cached: number;
  completion: number;
  /** Price key of the model, when the call reported it. */
  model?: string;
  connector_id?: string;
}

/** One assessment, with what it cost. */
export interface AgentAssessment {
  answer: AgentAnswer;
  /** Absent for agents without a model. */
  usage?: AgentUsage;
}

/** The triage agent: one bounded step per case. */
export interface ITriageAgent {
  kind: AgentKind;
  /** True when every call spends model tokens, so the daily model budget applies. */
  usesModel: boolean;
  /**
   * Assesses one case. With `openEvents`, an agent that can search may join the signal to
   * any open event it finds, not only the one code proposed.
   */
  assess(
    agentCase: AgentCase,
    options: { signal: AbortSignal; openEvents?: IOpenEventSearch }
  ): Promise<AgentAssessment>;
}
