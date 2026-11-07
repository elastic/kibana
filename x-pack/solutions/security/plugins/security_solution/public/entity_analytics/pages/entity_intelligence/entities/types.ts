/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/entity_analytics/types';
import type { IntelligenceEntity, RiskLevel } from '../common';

/** Trend window selection driving deltas and window-scoped tiles. */
export type TrendWindow = 'w1' | 'w7' | 'w30';

/** Which KPI sub-tab is showing (mirrors the mock's `kpiTab`). */
export type KpiTab = 'attention' | 'pulse';

/** Tile size — expanded shows sparklines/subtext, compact is a single line. */
export type TileSize = 'long' | 'short';

/** Entity type toolbar filter — uses the entity store engine type. */
export type EntityTypeFilter = 'all' | 'user' | 'service' | 'host';

/** Direction of the risk score over the trend window. */
export type RiskTrendFilter = 'any' | 'up' | 'down';

/** Watchlist sentinels used alongside specific watchlist names. */
export const WATCHLIST_ANY = '__any__';
export const WATCHLIST_NONE = '__none__';

/** The keys of the actionable ("Needs attention") triage tiles. */
export type TriageTileKey =
  | 'highrisk'
  | 'untriaged'
  | 'firsthigh'
  | 'newrule'
  | 'newalerted'
  | 'watchlisted';

/**
 * A single resolution-group identity for an entity. Ported from the mock's
 * `identities` triple, but sourced from real entity-store source identifiers
 * and the resolution lookup table.
 */
export interface ResolutionIdentity {
  /** Short source label (e.g. `crowdstrike`, `endpoint`, `okta`). */
  source: string;
  /** The identity value (e.g. `ACME\\svc-backup`, `arn:aws:iam::…`). */
  value: string;
  /** Optional human note (e.g. relationship type / domain). */
  note?: string;
}

/** Per-window delta triple for an entity (alerts / risk / anomalies change). */
export interface EntityDelta {
  alerts: number;
  risk: number;
  anoms: number;
}

export type EvidenceStatus = 'available' | 'unavailable' | 'ambiguous' | 'partial';
export type EvidenceKind =
  | 'alerts'
  | 'cases'
  | 'attacks'
  | 'anomalies'
  | 'watchlists'
  | 'riskHistory';

/**
 * A fully-enriched entity row: the entity-store record plus every joined
 * signal (alerts, cases, anomalies, attacks, watchlists, rules, deltas). Every
 * signal carries its availability separately from its numeric rendering value.
 */
export interface EntityRow {
  /** Underlying entity-store record (id, name, risk, criticality, source…). */
  base: IntelligenceEntity;
  /** Availability and resolution quality of each joined evidence source. */
  evidence?: Partial<Record<EvidenceKind, EvidenceStatus>>;
  /** Raw ECS identifier value used for alert/case correlation. */
  identifierValue: string;
  /** Convenience mirror of `base.type`. */
  type: EntityType;
  /** True when the entity store engine type is an application service. */
  isService: boolean;
  /** Risk score 0–100 (0 when unscored). */
  risk: number;
  /** Risk level band derived from the score. */
  level: RiskLevel;
  /** Asset criticality label (e.g. `high_impact`), or undefined. */
  criticality: string | undefined;
  /** Open detection alert count for this entity. */
  alerts: number;
  /** Alerts not attached to any case. */
  uncased: number | undefined;
  /** Distinct detection rule names that fired for this entity. */
  ruleNames: string[];
  /** Rule names that first fired within the trend window ("NEW"). */
  newRules: string[];
  /** ML anomaly record count (score ≥ threshold). */
  anoms: number;
  /** Attack Discovery count referencing this entity. */
  attacks: number;
  /** Number of cases this entity appears in. */
  cases: number;
  /** Watchlist names this entity belongs to. */
  watchlists: string[];
  /** Resolution-group identities (real-world identity sources). */
  identities: ResolutionIdentity[];
  /** First-seen epoch ms (entity.lifecycle.first_seen), or undefined. */
  firstSeen: number | undefined;
  /** Last-seen epoch ms (entity.lifecycle.last_seen), or undefined. */
  lastSeen: number | undefined;
  /** Last alert epoch ms, or undefined. */
  lastAlert: number | undefined;
  /** First time the entity's risk EVER reached High/Critical, epoch ms. */
  firstHighAt: number | undefined;
  /** Per-window delta triple. */
  deltas: Record<TrendWindow, EntityDelta>;
  /** Case ids this entity is associated with (for the case filter). */
  caseIds: string[];
  /** Attack Discovery ids referencing this entity (for the attack filter). */
  attackIds: string[];
}

/**
 * A filter snapshot: every toolbar/tile filter except the free-text search.
 * The live state, saved filter groups, and chip match-counts all speak this
 * shape (faithfully ported from the mock's `captureSnap`).
 */
export interface FilterSnapshot {
  type: EntityTypeFilter;
  levels: RiskLevel[];
  crits: string[];
  trend: RiskTrendFilter;
  rule: string | null;
  watchlists: string[];
  tileFilter: TriageTileKey | null;
  /** Case id filter — "entities in case X". */
  caseId: string | null;
  /** Attack Discovery id filter — "entities part of attack Y". */
  attackId: string | null;
}

/** A named, persisted preset capturing a filter snapshot. */
export interface SavedFilterGroup {
  id: string;
  name: string;
  builtin: boolean;
  snap: FilterSnapshot;
}

/** A configurable table column definition. */
export interface ColumnDef {
  id: EntityColumnId;
  num?: boolean;
  sortable?: boolean;
}

export type EntityColumnId =
  | 'name'
  | 'criticality'
  | 'risk'
  | 'alerts'
  | 'uncased'
  | 'rules'
  | 'anoms'
  | 'attacks'
  | 'cases'
  | 'watchlists'
  | 'identity'
  | 'firstSeen'
  | 'lastSeen'
  | 'lastAlert';

/** Persisted column preferences (order + visibility). */
export interface ColumnPrefs {
  order: EntityColumnId[];
  vis: EntityColumnId[];
}

/** Sort descriptor: column id and direction (1 asc, -1 desc). */
export interface SortState {
  col: EntityColumnId;
  dir: 1 | -1;
}
