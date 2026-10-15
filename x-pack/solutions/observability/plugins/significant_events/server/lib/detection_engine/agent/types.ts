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
} from '../../../../common/detection_engine/types';
import type { EsqlRow } from '../esql_helpers';

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
    members: Array<{ title: string; service: string; strategy: DetectionStrategyId }>;
  };
  join_proposal?: { event_id: string; reason: string; relation: string; minutes_apart: number };
  evidence: CaseEvidence[];
  firing_customer_alerts: Array<{ title: string; service: string }>;
  related_services: string[];
  /** Notes the learning loop kept for these series, such as past dismissals. */
  memory: string[];
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

/** The discovery agent: one bounded step per case. */
export interface IDiscoveryAgent {
  kind: AgentKind;
  connectorId?: string;
  assess(agentCase: AgentCase): Promise<AgentAnswer>;
  /** Model tokens used so far. All zero for agents without a model. */
  usage(): AgentUsage;
}

/** Tokens a model agent used. `cached` is part of `prompt`; thinking counts as completion. */
export interface AgentUsage {
  prompt: number;
  cached: number;
  completion: number;
}
