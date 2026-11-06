/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import type { RiskSeverity } from '../../../../common/search_strategy';

/**
 * Everything that can happen to an entity, as one flat list of typed events.
 * Each lens (full history, risk explanation, attack) is a view over the same list.
 */
export type EntityTimelineEventKind =
  | 'alert'
  | 'alert_burst'
  | 'anomaly'
  | 'attack'
  | 'risk_level'
  | 'criticality'
  | 'watchlist'
  | 'resolution'
  | 'identity'
  | 'case'
  | 'note'
  | 'response_action'
  | 'alertzero';

export type EntityTimelineCategory = 'detections' | 'risk' | 'identity' | 'response' | 'alertzero';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'open' | 'acknowledged' | 'closed';

export type AlertZeroWatch = 'Triage' | 'Hunt' | 'Detection' | 'Forensics';

export type AlertZeroStatus = 'pending' | 'approved' | 'rejected';

/** Resolved-entity record the event was observed on. */
export type EntityRecordSource = 'Active Directory' | 'Okta' | 'Workday' | 'AWS';

export interface BurstRule {
  name: string;
  count: number;
}

export interface EntityTimelineEvent {
  id: string;
  kind: EntityTimelineEventKind;
  timestamp: string;
  title: string;
  description?: string;
  /** Product or person the event came from (rule source, integration, analyst, AlertZero Watch). */
  source: string;
  /** Which resolved record the event was observed on, when the entity is a resolution group. */
  record?: EntityRecordSource;
  /** A turning point worth highlighting (first-time behavior, level change, new attack). */
  keyReason?: string;
  host?: string;
  /** MITRE ATT&CK tactic. */
  tactic?: string;

  // Alerts and alert bursts
  severity?: AlertSeverity;
  ruleScore?: number;
  status?: AlertStatus;
  /** Contribution to the current risk score; undefined = does not contribute. */
  contribution?: number;
  attackId?: string;
  caseId?: string;
  /** ML job that produced the anomaly (or the anomaly an ML rule promoted). */
  mlJob?: string;
  anomalyScore?: number;
  alertCount?: number;
  burstRules?: BurstRule[];

  // Attack discovery
  alertIds?: string[];
  tactics?: string[];
  relatedEntities?: Array<{ name: string; type: 'user' | 'host' | 'service' }>;
  attackRiskScore?: number;
  attackStart?: string;
  attackEnd?: string;

  // Risk score and modifiers
  riskFrom?: { score: number; level: RiskSeverity };
  riskTo?: { score: number; level: RiskSeverity };
  criticalityFrom?: CriticalityLevelWithUnassigned;
  criticalityTo?: CriticalityLevelWithUnassigned;
  watchlist?: string;
  watchlistAction?: 'added' | 'removed';
  /** Change to the modifier's contribution caused by this event. */
  contributionDelta?: number;

  // Cases
  caseAction?: 'opened' | 'attached' | 'closed';

  // AlertZero
  watch?: AlertZeroWatch;
  proposedAction?: string;
  alertZeroStatus?: AlertZeroStatus;
}

/** Modifiers in effect for the current score, including ones set before the risk window. */
export interface RiskModifierState {
  id: string;
  label: string;
  value: string;
  contribution: number;
  since: string;
  eventId?: string;
}

export interface EntityTimelineData {
  entityName: string;
  riskScore: number;
  riskLevel: RiskSeverity;
  /** Days the risk engine looks back. */
  riskWindowDays: number;
  modifiers: RiskModifierState[];
  events: EntityTimelineEvent[];
}

export type EntityTimelineLens = 'full' | 'risk';
