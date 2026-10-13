/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';

/**
 * Evidence gathered by signals. Signals emit facts about entities; the evidence registry keys
 * entities by EUID and numbers facts 1, 2, … in registry order within one brief. The brief cites
 * them by these numbers and the UI resolves them.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

/** What a fact points at, for its deep link. */
export type FactSourceType =
  | 'attack_discovery'
  | 'entity'
  // Emitted by the response-status signal; the guardrails already treat it as handling.
  | 'case';

export interface FactSource {
  type: FactSourceType;
  /** Absent for aggregate facts. */
  id?: string;
}

export interface Fact {
  /** 1-based, in registry order within one brief. */
  id: number;
  /** The signal that produced it. */
  signalId: string;
  /** Short human label; becomes the evidence chip label. */
  title: string;
  severity?: Severity;
  /** ISO time; facts with a time can appear on threat timelines. */
  timestamp?: string;
  /** EUIDs of the (golden) entities the fact is about. */
  entityIds: string[];
  /** The only numbers the AI may quote for this fact. */
  numbers?: Record<string, number>;
  /** Short non-numeric descriptors, e.g. { tactics: 'Initial Access, Lateral Movement' }. */
  details?: Record<string, string>;
  /** Deep-link target for the chip. */
  source?: FactSource;
}

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
  /** Each signal's run, keyed by signal id, in run order. */
  signals: Record<string, SignalRun>;
}

/** True when any signal found something; without findings the AI is not called and no brief is written. */
export const hasFindings = ({ facts }: Evidence): boolean => facts.length > 0;
