/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';

/**
 * Evidence gathered by signals. Signals emit facts and links about entities; the evidence
 * registry keys entities by EUID and numbers facts and links (1, 2, …, each in registry order
 * within one brief). The brief cites them by these numbers and the UI resolves them.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

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
  /** 1-based, in registry order within one brief. */
  id: number;
  kind: FactKind;
  /** The signal that produced it. */
  signalId: string;
  /** Short human label; becomes the evidence chip label. */
  title: string;
  /** ISO time; facts with a time can appear on threat timelines. */
  timestamp?: string;
  severity?: Severity;
  /** EUIDs of the (golden) entities the fact is about. */
  entityIds: string[];
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
  /** 1-based, in registry order within one brief. */
  id: number;
  type: LinkType;
  /** EUID of the entity the link starts from. */
  fromEntityId: string;
  /** EUID of the entity the link points to. */
  toEntityId: string;
  /** Ids of the facts that back the link, if any. */
  factIds: number[];
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

export type SignalStatus = 'ok' | 'empty' | 'unavailable' | 'timeout' | 'error';

/** What one signal's run came to, as stored and returned. */
export interface SignalRun {
  status: SignalStatus;
  /** Duration in milliseconds. */
  took: number;
}

export interface Evidence {
  /**
   * Golden entities' Entity Store records by EUID. For a resolution group, `asset.criticality` and
   * `entity.attributes.watchlists` hold the whole group's values.
   */
  entities: Record<string, Entity>;
  facts: Fact[];
  links: Link[];
  /** Each signal's run, keyed by signal id, in run order. */
  signals: Record<string, SignalRun>;
}

/** True when any signal found something; without findings the AI is not called and no brief is written. */
export const hasFindings = ({ facts, links }: Evidence): boolean =>
  facts.length > 0 || links.length > 0;
