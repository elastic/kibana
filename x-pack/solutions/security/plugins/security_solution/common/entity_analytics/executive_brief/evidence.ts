/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Evidence gathered by signals. Signals emit facts and links about entities; the evidence
 * registry assigns stable ids (ENT-n, F-n, L-n) that the AI cites and the UI resolves.
 */

export type EntityId = `ENT-${number}`;
export type FactId = `F-${number}`;
export type LinkId = `L-${number}`;
export type EvidenceId = EntityId | FactId | LinkId;

export type BriefEntityType = 'user' | 'host' | 'service' | 'generic';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** Entity Analytics capabilities, shown as "how it was found" chips. */
export type EaCapability =
  | 'attack_discovery'
  | 'detections'
  | 'risk_scoring'
  | 'asset_criticality'
  | 'watchlists'
  | 'relationships'
  | 'entity_resolution'
  | 'hunting_leads'
  | 'cases';

export interface BriefEntity {
  id: EntityId;
  /** Entity Store id (golden entity after resolution). */
  euid: string;
  type: BriefEntityType;
  name: string;
  riskScore?: number;
  riskLevel?: string;
  criticality?: string;
  watchlists?: string[];
  privileged?: boolean;
  /** Number of resolved aliases folded into this entity. */
  aliasCount?: number;
}

export type FactKind =
  | 'attack_discovery'
  | 'alert_activity'
  | 'high_risk_entity'
  | 'alert_response'
  | 'case'
  | 'relationship_first_seen'
  | 'risk_jump'
  | 'lead';

export type FactSourceType = 'attack_discovery' | 'case' | 'rule' | 'lead';

export interface FactSource {
  type: FactSourceType;
  id: string;
  name?: string;
}

export interface Fact {
  id: FactId;
  kind: FactKind;
  /** The signal that produced it. */
  signalId: string;
  /** Short human label; becomes the evidence chip label. */
  title: string;
  /** ISO time; facts with a time can appear on threat timelines. */
  at?: string;
  severity?: Severity;
  entities: EntityId[];
  /** The only numbers the AI may quote for this fact. */
  numbers?: Record<string, number>;
  /** Short non-numeric descriptors, e.g. { tactics: 'Initial Access, Lateral Movement' }. */
  details?: Record<string, string>;
  /** Deep-link target for the chip. */
  source?: FactSource;
}

export type LinkType =
  | 'same_attack'
  | 'co_alert'
  | 'same_lead'
  | 'owns'
  | 'administers'
  | 'accesses_rarely'
  | 'accesses_frequently'
  | 'communicates_with'
  | 'supervises';

export interface Link {
  id: LinkId;
  type: LinkType;
  from: EntityId;
  to: EntityId;
  /** Facts that back the link, if any. */
  factIds: FactId[];
  /** First time the link was observed, when known. */
  firstSeen?: string;
}

/** The only wording the AI may use to describe each link type. */
export const LINK_VERBS: Record<LinkType, string> = {
  same_attack: 'part of the same discovered attack',
  co_alert: 'appeared together in alerts',
  same_lead: 'related in a hunting lead',
  owns: 'owns',
  administers: 'administers',
  accesses_rarely: 'logged on to (rarely)',
  accesses_frequently: 'regularly logs on to',
  communicates_with: 'communicates with',
  supervises: 'manages',
};

export const FACT_KIND_CAPABILITY: Record<FactKind, EaCapability> = {
  attack_discovery: 'attack_discovery',
  alert_activity: 'detections',
  high_risk_entity: 'risk_scoring',
  alert_response: 'detections',
  case: 'cases',
  relationship_first_seen: 'relationships',
  risk_jump: 'risk_scoring',
  lead: 'hunting_leads',
};

export type SignalStatus = 'ok' | 'empty' | 'unavailable' | 'timeout' | 'error';

export interface SignalRun {
  id: string;
  title: string;
  capability: EaCapability;
  status: SignalStatus;
  /** Why it was unavailable or failed, in plain words. */
  reason?: string;
  durationMs: number;
  factCount: number;
  linkCount: number;
}

export interface Evidence {
  entities: Record<EntityId, BriefEntity>;
  facts: Fact[];
  links: Link[];
  signals: SignalRun[];
}

/** True when any signal found something; without findings the AI is not called and no brief is written. */
export const hasFindings = ({ facts, links }: Evidence): boolean =>
  facts.length > 0 || links.length > 0;
