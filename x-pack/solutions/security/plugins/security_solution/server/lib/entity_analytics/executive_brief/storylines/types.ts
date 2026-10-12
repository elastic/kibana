/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefSeverity,
  ClusterTraceStep,
  LinkStrength,
  SeedKind,
  StoryEdgeType,
  StoryResponse,
} from '../../../../../common/entity_analytics/executive_brief/types';

/**
 * Internal (pre-registry) types of the storyline builder. The pure clustering code never touches
 * the evidence registry: seeds and edges carry opaque `refKey`s, which `finalize` resolves to
 * evidence ids only for the storylines that survive ranking, so the catalog contains no evidence
 * for dropped candidates.
 */

export interface ClusterSeed {
  kind: SeedKind;
  /** Opaque key, resolved to an evidence id at finalisation (e.g. `ad:<alertId>`). */
  refKey: string;
  /** Golden euids. */
  entityEuids: string[];
  /** Normalised 0..1. */
  severity: number;
  /** ISO timestamp. */
  at: string;
}

export interface ClusterEdge {
  type: StoryEdgeType;
  /** Golden euid. */
  from: string;
  /** Golden euid. */
  to: string;
  /** Opaque evidence keys supporting the edge (e.g. `rule:<uuid>`, `ad:<id>`). */
  refKeys: string[];
}

export interface ClusterEntityFacts {
  euid: string;
  type: 'user' | 'host' | 'service' | 'generic';
  criticality?: string;
  riskScoreNorm?: number;
  /** Distinct entities interacting with this one (`countInteractingEntities`). */
  interactionDegree?: number;
  /** Managed / shared / service identity. Always a hub. */
  isManaged?: boolean;
  /** ISO timestamp of the latest alert on the entity, when known. */
  lastActivityAt?: string;
}

export interface ClusterInput {
  seeds: ClusterSeed[];
  edges: ClusterEdge[];
  facts: Record<string, ClusterEntityFacts>;
  /** ISO timestamp, the fixed "now". */
  now: string;
}

export interface StorylineComponent {
  /** Smallest golden euid in the core; stable key of the component. */
  key: string;
  /** Final (capped) non-hub members, seeds first. */
  entityEuids: string[];
  hubEuids: string[];
  seeds: ClusterSeed[];
  edges: ClusterEdge[];
  severity: BriefSeverity;
  /** max seed severity, before criticality. */
  maxSeedSeverity: number;
  /** Max criticality multiplier over the non-hub members (1.0 when none is known). */
  critMult: number;
  /** ISO timestamp of the latest seed / entity activity (falls back to `now`). */
  latestAt: string;
  linkStrength: LinkStrength;
}

export interface ComponentsResult {
  /** Qualifying components only. */
  components: StorylineComponent[];
  /** Seed entities (non-hub and hub) with their best seed severity, for "other notable". */
  seedSeverity: Record<string, number>;
  trace: ClusterTraceStep[];
  hubs: string[];
}

export interface RankedStoryline extends StorylineComponent {
  rank: number;
  score: number;
  response: StoryResponse;
}

export interface ClusterResult {
  storylines: RankedStoryline[];
  otherNotableEntities: string[];
  trace: ClusterTraceStep[];
}
