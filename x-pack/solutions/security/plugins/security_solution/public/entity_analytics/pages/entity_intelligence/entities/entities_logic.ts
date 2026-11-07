/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskLevel } from '../common';
import type {
  ColumnDef,
  ColumnPrefs,
  EntityColumnId,
  EntityRow,
  FilterSnapshot,
  SavedFilterGroup,
  SortState,
  TrendWindow,
  TriageTileKey,
} from './types';
import { WATCHLIST_ANY, WATCHLIST_NONE } from './types';
import { evidenceKindForColumn, hasEvidence } from './evidence';

export const DAY_MS = 86_400_000;

/** Trend window → span in ms. Mirrors the mock's `WIN_MS`. */
export const WINDOW_MS: Record<TrendWindow, number> = {
  w1: DAY_MS,
  w7: 7 * DAY_MS,
  w30: 30 * DAY_MS,
};

/** Risk-engine bands (Elastic risk engine). Mirrors the mock's `LEVELS`. */
export const RISK_BANDS: ReadonlyArray<{ level: RiskLevel; min: number }> = [
  { level: 'Critical', min: 90 },
  { level: 'High', min: 70 },
  { level: 'Moderate', min: 40 },
  { level: 'Low', min: 20 },
  { level: 'Unknown', min: 0 },
] as const;

/** Derives the risk level band for a raw score (0–100). */
export const levelOf = (risk: number): RiskLevel =>
  RISK_BANDS.find((band) => risk >= band.min)?.level ?? 'Unknown';

/** Returns the known uncased alert count, preserving unavailable associations. */
export const uncasedOf = (row: EntityRow): number | undefined => row.uncased;

/** True when the entity was first seen within the trend window. */
export const isNewIn = (row: EntityRow, win: TrendWindow, now: number): boolean =>
  row.firstSeen !== undefined && now - row.firstSeen <= WINDOW_MS[win];

/** New entities that are already alerting — the triage-worthy slice of "new". */
export const isNewAlertedIn = (row: EntityRow, win: TrendWindow, now: number): boolean =>
  hasEvidence(row, 'alerts') && isNewIn(row, win, now) && row.alerts > 0;

/** First-ever High/Critical within the window (from risk history). */
export const isFirstHighIn = (row: EntityRow, win: TrendWindow, now: number): boolean =>
  hasEvidence(row, 'riskHistory') &&
  row.risk >= 70 &&
  row.firstHighAt !== undefined &&
  now - row.firstHighAt <= WINDOW_MS[win];

/** True when a rule first fired for this entity within the window. */
export const hasNewRuleIn = (row: EntityRow): boolean =>
  hasEvidence(row, 'alerts') && row.newRules.length > 0;

/**
 * The predicate for each actionable triage tile. Only these tiles filter the
 * table (the pulse tiles are org-scale context only). Faithfully ported from
 * the mock's `TILE_FILTERS`.
 */
export const tileMatches = (
  key: TriageTileKey,
  row: EntityRow,
  win: TrendWindow,
  now: number
): boolean => {
  switch (key) {
    case 'highrisk':
      return row.risk >= 70;
    case 'untriaged':
      return row.risk >= 70 && hasEvidence(row, 'cases') && row.cases === 0;
    case 'firsthigh':
      return isFirstHighIn(row, win, now);
    case 'newrule':
      return hasNewRuleIn(row);
    case 'newalerted':
      return isNewAlertedIn(row, win, now);
    case 'watchlisted':
      return hasEvidence(row, 'watchlists') && row.watchlists.length > 0;
    default:
      return false;
  }
};

/** Population count for a triage tile across the full row set. */
export const tilePopulation = (
  key: TriageTileKey,
  rows: EntityRow[],
  win: TrendWindow,
  now: number
): number => rows.filter((row) => tileMatches(key, row, win, now)).length;

/** Filters by the entity store engine type without classifying services as accounts. */
export const matchesTypeFilter = (row: EntityRow, type: FilterSnapshot['type']): boolean => {
  if (type === 'service') return row.type === EntityType.service;
  if (type === 'user') return row.type === EntityType.user;
  if (type === 'all') return true;
  return row.type === (type as EntityType);
};

/**
 * Whether an entity matches a filter snapshot (excluding free-text search).
 * Faithfully ported from the mock's `snapMatch`, extended with the real
 * case/attack pivots the user explicitly asked for.
 */
export const snapshotMatches = (
  row: EntityRow,
  snap: FilterSnapshot,
  win: TrendWindow,
  now: number
): boolean => {
  if (snap.tileFilter && !tileMatches(snap.tileFilter, row, win, now)) return false;
  if (!matchesTypeFilter(row, snap.type)) return false;
  if (snap.levels.length && !snap.levels.includes(row.level)) return false;
  if (snap.crits.length && (!row.criticality || !snap.crits.includes(row.criticality))) {
    return false;
  }
  if (snap.trend !== 'any' && !hasEvidence(row, 'riskHistory')) return false;
  if (snap.rule && !hasEvidence(row, 'alerts')) return false;
  if (snap.caseId && !hasEvidence(row, 'cases')) return false;
  if (snap.attackId && !hasEvidence(row, 'attacks')) return false;
  if (snap.watchlists.length && !hasEvidence(row, 'watchlists')) return false;
  if (snap.trend === 'up' && row.deltas[win].risk <= 0) return false;
  if (snap.trend === 'down' && row.deltas[win].risk >= 0) return false;
  if (snap.rule && !row.ruleNames.includes(snap.rule)) return false;
  if (snap.caseId && !row.caseIds.includes(snap.caseId)) return false;
  if (snap.attackId && !row.attackIds.includes(snap.attackId)) return false;
  if (snap.watchlists.length) {
    const onSelected = row.watchlists.some((w) => snap.watchlists.includes(w));
    const anyOk = snap.watchlists.includes(WATCHLIST_ANY) && row.watchlists.length > 0;
    const noneOk = snap.watchlists.includes(WATCHLIST_NONE) && row.watchlists.length === 0;
    if (!onSelected && !anyOk && !noneOk) return false;
  }
  return true;
};

/** True when the search text matches the name or any resolution identity. */
export const searchMatches = (row: EntityRow, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (row.base.name.toLowerCase().includes(q)) return true;
  return row.identities.some((identity) => identity.value.toLowerCase().includes(q));
};

/** Asset criticality rank for sorting (higher = more critical). */
export const CRIT_RANK: Record<string, number> = {
  extreme_impact: 4,
  high_impact: 3,
  medium_impact: 2,
  low_impact: 1,
};

/** Value extracted from a row for a given sort column. Ported from `sortVal`. */
export const sortValue = (
  row: EntityRow,
  col: EntityColumnId,
  win: TrendWindow
): number | string => {
  switch (col) {
    case 'name':
      return row.base.name.toLowerCase();
    case 'identity':
      return row.identities.length;
    case 'rules':
      return row.ruleNames.length;
    case 'uncased':
      return uncasedOf(row) ?? 0;
    case 'criticality':
      return row.criticality ? CRIT_RANK[row.criticality] ?? 0 : 0;
    case 'risk':
      return row.risk;
    case 'alerts':
      return row.alerts;
    case 'anoms':
      return row.anoms;
    case 'attacks':
      return row.attacks;
    case 'cases':
      return row.cases;
    case 'firstSeen':
      return row.firstSeen ?? 0;
    case 'lastSeen':
      return row.lastSeen ?? 0;
    case 'lastAlert':
      return row.lastAlert ?? 0;
    case 'watchlists':
      return row.watchlists.length;
    default:
      return 0;
  }
};

/** Stable comparator for the given sort state. */
export const compareRows = (
  a: EntityRow,
  b: EntityRow,
  sort: SortState,
  win: TrendWindow
): number => {
  const kind = evidenceKindForColumn(sort.col);
  const aUnknown =
    sort.col === 'uncased' ? a.uncased === undefined : kind ? !hasEvidence(a, kind) : false;
  const bUnknown =
    sort.col === 'uncased' ? b.uncased === undefined : kind ? !hasEvidence(b, kind) : false;
  if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
  const va = sortValue(a, sort.col, win);
  const vb = sortValue(b, sort.col, win);
  const cmp = va < vb ? -1 : va > vb ? 1 : 0;
  return cmp * sort.dir;
};

/**
 * Filters (snapshot + search) and sorts rows for display. Pure and testable —
 * mirrors the mock's `visibleEntities`.
 */
export const selectVisibleRows = (
  rows: EntityRow[],
  snap: FilterSnapshot,
  query: string,
  sort: SortState,
  win: TrendWindow,
  now: number
): EntityRow[] =>
  rows
    .filter((row) => snapshotMatches(row, snap, win, now) && searchMatches(row, query))
    .sort((a, b) => compareRows(a, b, sort, win));

/* ================= Filter snapshot equality & description ================= */

const setEq = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x) => b.includes(x));

/** Empty snapshot with optional overrides. Mirrors the mock's `mkSnap`. */
export const emptySnapshot = (overrides: Partial<FilterSnapshot> = {}): FilterSnapshot => ({
  type: 'all',
  levels: [],
  crits: [],
  trend: 'any',
  rule: null,
  watchlists: [],
  tileFilter: null,
  caseId: null,
  attackId: null,
  ...overrides,
});

/** Deep equality of two snapshots (order-insensitive for sets). */
export const snapshotsEqual = (a: FilterSnapshot, b: FilterSnapshot): boolean =>
  a.type === b.type &&
  a.trend === b.trend &&
  a.rule === b.rule &&
  a.tileFilter === b.tileFilter &&
  a.caseId === b.caseId &&
  a.attackId === b.attackId &&
  setEq(a.levels, b.levels) &&
  setEq(a.crits, b.crits) &&
  setEq(a.watchlists, b.watchlists);

/** True when the snapshot carries any active filter. */
export const snapshotIsActive = (snap: FilterSnapshot): boolean =>
  !snapshotsEqual(snap, emptySnapshot());

/* ================= Column preferences ================= */

/** All configurable columns (Name is pinned first, excluded from ordering). */
export const COLUMNS: readonly ColumnDef[] = [
  { id: 'name', sortable: true },
  { id: 'criticality', sortable: true },
  { id: 'risk', num: true, sortable: true },
  { id: 'alerts', num: true, sortable: true },
  { id: 'uncased', num: true, sortable: true },
  { id: 'rules', sortable: true },
  { id: 'anoms', num: true, sortable: true },
  { id: 'attacks', num: true, sortable: true },
  { id: 'cases', num: true, sortable: true },
  { id: 'watchlists', sortable: false },
  { id: 'identity', sortable: true },
  { id: 'firstSeen', sortable: true },
  { id: 'lastSeen', sortable: true },
  { id: 'lastAlert', sortable: true },
] as const;

/** Column ids that can be reordered/hidden (everything except pinned Name). */
export const DEFAULT_ORDER: EntityColumnId[] = COLUMNS.filter((c) => c.id !== 'name').map(
  (c) => c.id
);

/** Deep-dive columns hidden by default (opt back in via the Columns menu). */
export const DEFAULT_HIDDEN: EntityColumnId[] = ['identity', 'watchlists', 'anoms', 'lastSeen'];

/** Default visible set (everything orderable minus the default-hidden set). */
export const defaultVisible = (): EntityColumnId[] =>
  DEFAULT_ORDER.filter((id) => !DEFAULT_HIDDEN.includes(id));

export const COLUMN_PREFS_STORAGE_KEY = 'securitySolution.entityIntelligence.entities.cols.v1';

const ALL_ORDERABLE = new Set<EntityColumnId>(DEFAULT_ORDER);

/**
 * Validates and normalizes persisted column preferences. Falls back to the
 * defaults if the persisted shape is stale/invalid. Mirrors `loadColPrefs`.
 */
export const parseColumnPrefs = (raw: string | null): ColumnPrefs => {
  const fallback: ColumnPrefs = { order: [...DEFAULT_ORDER], vis: defaultVisible() };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<ColumnPrefs> | null;
    if (
      parsed &&
      Array.isArray(parsed.order) &&
      parsed.order.length === DEFAULT_ORDER.length &&
      parsed.order.every((id) => ALL_ORDERABLE.has(id as EntityColumnId))
    ) {
      return {
        order: parsed.order as EntityColumnId[],
        vis: (Array.isArray(parsed.vis) ? parsed.vis : []).filter((id) =>
          ALL_ORDERABLE.has(id as EntityColumnId)
        ) as EntityColumnId[],
      };
    }
  } catch (err) {
    // Ignore malformed JSON and fall back to defaults.
  }
  return fallback;
};

export const serializeColumnPrefs = (prefs: ColumnPrefs): string => JSON.stringify(prefs);

/**
 * Computes the active columns in display order: pinned Name first, then the
 * user's ordered + visible columns. Mirrors the mock's `activeCols`.
 */
export const activeColumns = (prefs: ColumnPrefs): ColumnDef[] => {
  const nameCol = COLUMNS.find((c) => c.id === 'name');
  const visSet = new Set(prefs.vis);
  const rest = prefs.order
    .filter((id) => visSet.has(id))
    .map((id) => COLUMNS.find((c) => c.id === id))
    .filter((c): c is ColumnDef => c !== undefined);
  return nameCol ? [nameCol, ...rest] : rest;
};

/** Moves `dragged` before/after `target` within an order array (pure). */
export const reorderColumns = (
  order: EntityColumnId[],
  dragged: EntityColumnId,
  target: EntityColumnId,
  before: boolean
): EntityColumnId[] => {
  if (dragged === target) return [...order];
  const next = order.filter((id) => id !== dragged);
  const targetIdx = next.indexOf(target);
  if (targetIdx === -1) return [...order];
  next.splice(targetIdx + (before ? 0 : 1), 0, dragged);
  return next;
};

/* ================= Saved filter groups ================= */

export const SAVED_GROUPS_STORAGE_KEY =
  'securitySolution.entityIntelligence.entities.savedGroups.v1';

/** Builtin saved filter groups (always present). Ported from the mock. */
export const builtinSavedGroups = (): SavedFilterGroup[] => [
  {
    id: 'builtin-crown-jewels-rising',
    name: 'Crown jewels · rising risk',
    builtin: true,
    snap: emptySnapshot({ crits: ['extreme_impact', 'high_impact'], trend: 'up' }),
  },
  {
    id: 'builtin-untriaged-high',
    name: 'Untriaged high-risk',
    builtin: true,
    snap: emptySnapshot({ tileFilter: 'untriaged' }),
  },
  {
    id: 'builtin-critical-services',
    name: 'Critical services',
    builtin: true,
    snap: emptySnapshot({ type: 'service', levels: ['Critical', 'High'] }),
  },
];

/** Parses persisted user-created saved groups; ignores malformed entries. */
export const parseSavedGroups = (raw: string | null): SavedFilterGroup[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (g): g is SavedFilterGroup =>
          g &&
          typeof g.id === 'string' &&
          typeof g.name === 'string' &&
          typeof g.snap === 'object' &&
          g.snap !== null
      )
      .map((g) => ({ ...g, builtin: false, snap: emptySnapshot(g.snap) }));
  } catch (err) {
    return [];
  }
};

export const serializeSavedGroups = (groups: SavedFilterGroup[]): string =>
  JSON.stringify(groups.filter((g) => !g.builtin));

/** Count of rows matching a saved group's snapshot (for chip badges). */
export const savedGroupCount = (
  group: SavedFilterGroup,
  rows: EntityRow[],
  win: TrendWindow,
  now: number
): number => rows.filter((row) => snapshotMatches(row, group.snap, win, now)).length;
