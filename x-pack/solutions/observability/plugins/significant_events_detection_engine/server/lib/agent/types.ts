/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentKind,
  DetectionStrategyId,
  EngineEventStatus,
  EngineSeverity,
  EvidenceResult,
  EvidenceVerdict,
} from '../../../common';
import type { EsqlRow } from '../esql';

/** One piece of evidence, with an id the agent must cite. */
export interface CaseEvidence {
  id: string;
  fingerprint: string;
  title: string;
  unit: string;
  query: string;
  result: EvidenceResult;
  rows: EsqlRow[];
  error?: string;
}

export interface CaseDetection {
  fingerprint: string;
  strategy: DetectionStrategyId;
  service: string;
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
  /** New: no event exists. Join: code proposes an open event. Reopen: a closed event's problem is back. */
  kind: 'new_event' | 'join' | 'reopen';
  detection: CaseDetection;
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
      strategy: DetectionStrategyId;
      importance: number;
    }>;
  };
  join_proposal?: {
    event_id: string;
    reason: string;
    relation: string;
    /** The service linking them; for a shared dependency, the one both call. */
    via: string;
    minutes_apart: number;
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
  join_decision?: 'confirm' | 'veto';
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

/** The discovery agent: one bounded step per case. */
export interface IDiscoveryAgent {
  kind: AgentKind;
  /** True when every call spends model tokens, so the daily model budget applies. */
  usesModel: boolean;
  assess(agentCase: AgentCase, options: { signal: AbortSignal }): Promise<AgentAssessment>;
}
