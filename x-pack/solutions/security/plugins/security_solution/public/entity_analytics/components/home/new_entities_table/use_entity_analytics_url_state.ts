/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { getEntityAnalyticsEntityTypes } from '../../../../../common/entity_analytics/utils';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { SEVERITY_UI_SORT_ORDER } from '../../../common/utils';
import { ValidCriticalityLevels } from '../../../../../common/entity_analytics/asset_criticality/constants';
import {
  GROUP_SIZE_FIELD,
  RISK_SCORE_NORM_FIELD,
  PAGE_SIZE_OPTIONS,
  TIME_RANGE_OPTIONS,
} from './common';
import type { RowsMode, TimeRange } from './common';
import { isSignalCardId, type SignalCardId } from '../needs_attention_tiles/data';

export { TIME_RANGE_OPTIONS };
export type { TimeRange, RowsMode };

export interface EntityFilters {
  entityTypes: EntityType[];
  riskLevels: RiskSeverity[];
  assetCriticality: string[];
  watchlists: string[];
  dataSources: string[];
}

export const EMPTY_ENTITY_FILTERS: EntityFilters = {
  entityTypes: [],
  riskLevels: [],
  assetCriticality: [],
  watchlists: [],
  dataSources: [],
};

// ── param keys ────────────────────────────────────────────────────────────────

const PARAM = {
  TIME_RANGE: 'eaTimeRange',
  ROWS_MODE: 'eaRowsMode',
  SORT_FIELD: 'eaSortField',
  SORT_DIR: 'eaSortDir',
  PAGE: 'eaPage',
  PAGE_SIZE: 'eaPageSize',
  EXPANDED: 'eaExpanded',
  ACTIVE_TILE: 'eaActiveTile',
  // entity filter params kept identical to the existing hooks so bookmarked URLs remain valid
  ENTITY_TYPES: 'entityTypes',
  RISK_LEVELS: 'riskLevels',
  ASSET_CRITICALITY: 'assetCriticality',
  WATCHLISTS: 'watchlists',
  DATA_SOURCES: 'dataSources',
} as const;

/** Caps URL length; most recently expanded ids are kept. */
export const MAX_EXPANDED_ENTITY_IDS = 20;

// ── defaults ──────────────────────────────────────────────────────────────────

const DEFAULTS = {
  timeRange: '30d' as TimeRange,
  rowsMode: 'resolved' as RowsMode,
  sortField: RISK_SCORE_NORM_FIELD,
  sortDirection: 'desc' as const,
  pageIndex: 0,
  pageSize: PAGE_SIZE_OPTIONS[0],
};

// ── validators ────────────────────────────────────────────────────────────────

const VALID_ENTITY_TYPES = new Set<string>(getEntityAnalyticsEntityTypes());
const VALID_RISK_LEVELS = new Set<string>(SEVERITY_UI_SORT_ORDER);
const VALID_CRITICALITY = new Set<string>(ValidCriticalityLevels);

const isTimeRange = (v: string | null): v is TimeRange =>
  TIME_RANGE_OPTIONS.includes(v as TimeRange);
const isRowsMode = (v: string | null): v is RowsMode => v === 'resolved' || v === 'individual';
const isSortDir = (v: string | null): v is 'asc' | 'desc' => v === 'asc' || v === 'desc';
const isNonNegativeInt = (v: string | null): boolean =>
  v != null && /^\d+$/.test(v) && Number(v) >= 0;
const isPageSize = (v: string | null): boolean =>
  v != null && (PAGE_SIZE_OPTIONS as readonly number[]).includes(Number(v));

const isEntityType = (v: string): v is EntityType => VALID_ENTITY_TYPES.has(v);
const isRiskSeverity = (v: string): v is RiskSeverity => VALID_RISK_LEVELS.has(v);
const isCriticality = (v: string): boolean => VALID_CRITICALITY.has(v);

const splitParam = (raw: string) => raw.split(',').filter(Boolean);

const parseExpandedIds = (raw: string | null): string[] => {
  if (!raw) return [];
  const ids: string[] = [];
  for (const part of splitParam(raw)) {
    try {
      ids.push(decodeURIComponent(part));
    } catch {
      ids.push(part);
    }
  }
  return ids.slice(-MAX_EXPANDED_ENTITY_IDS);
};

const writeExpandedParam = (params: URLSearchParams, ids: string[]) => {
  const capped = ids.slice(-MAX_EXPANDED_ENTITY_IDS);
  if (capped.length) {
    params.set(PARAM.EXPANDED, capped.map(encodeURIComponent).join(','));
  } else {
    params.delete(PARAM.EXPANDED);
  }
};

// ── types ─────────────────────────────────────────────────────────────────────

export interface EntityAnalyticsUrlState {
  timeRange: TimeRange;
  rowsMode: RowsMode;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  pageSize: number;
  entityFilters: EntityFilters;
  /** Entity ids with expanded child rows (persisted across filter/pagination). */
  expandedIds: string[];
  /** Selected needs-attention tile; omitted from the URL when none. */
  activeTile: SignalCardId | null;
}

export interface EntityAnalyticsUrlStateResult extends EntityAnalyticsUrlState {
  setTimeRange: (val: TimeRange) => void;
  setRowsMode: (val: RowsMode) => void;
  /** Resets page to 0. */
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  setPage: (index: number) => void;
  /** Resets page to 0. */
  setPageSize: (size: number) => void;
  /** Resets page to 0. */
  setEntityFilters: (filters: EntityFilters) => void;
  /** Resets page to 0. Pass null to clear. */
  setActiveTile: (tile: SignalCardId | null) => void;
  /** Clears entity filters, active tile, and sort (foreign sorts can yield 0 rows). */
  resetGridQuery: () => void;
  resetPage: () => void;
  /** Toggles an entity id in `eaExpanded` without pushing history. */
  toggleExpandedId: (entityId: string) => void;
  /** Clears all expanded rows (e.g. on rows-mode switch). */
  clearExpandedIds: () => void;
}

// ── hook ──────────────────────────────────────────────────────────────────────

export const useEntityAnalyticsUrlState = (): EntityAnalyticsUrlStateResult => {
  const { search } = useLocation();
  const history = useHistory();

  // Normalise all params in a single replace so the URL is always consistent.
  useEffect(() => {
    const params = new URLSearchParams(history.location.search);
    let dirty = false;

    const ensure = (key: string, isValid: (v: string | null) => boolean, fallback: unknown) => {
      if (!isValid(params.get(key))) {
        params.set(key, String(fallback));
        dirty = true;
      }
    };

    ensure(PARAM.TIME_RANGE, isTimeRange, DEFAULTS.timeRange);
    ensure(PARAM.ROWS_MODE, isRowsMode, DEFAULTS.rowsMode);
    ensure(PARAM.SORT_DIR, isSortDir, DEFAULTS.sortDirection);
    ensure(PARAM.PAGE_SIZE, isPageSize, DEFAULTS.pageSize);
    if (!params.get(PARAM.SORT_FIELD)) {
      params.set(PARAM.SORT_FIELD, DEFAULTS.sortField);
      dirty = true;
    }
    // eaPage is omitted when 0 (cleaner URLs); only reject a present invalid value.
    const rawPage = params.get(PARAM.PAGE);
    if (rawPage !== null && !isNonNegativeInt(rawPage)) {
      params.delete(PARAM.PAGE);
      dirty = true;
    }
    // eaActiveTile is omitted when none; strip a present invalid value.
    const rawActiveTile = params.get(PARAM.ACTIVE_TILE);
    if (rawActiveTile !== null && !isSignalCardId(rawActiveTile)) {
      params.delete(PARAM.ACTIVE_TILE);
      dirty = true;
    }

    if (dirty) history.replace({ ...history.location, search: params.toString() });
  }, [history, search]);

  // ── read ──────────────────────────────────────────────────────────────────

  const p = useMemo(() => new URLSearchParams(search), [search]);

  const rawTimeRange = p.get(PARAM.TIME_RANGE);
  const timeRange = useMemo(
    (): TimeRange => (isTimeRange(rawTimeRange) ? rawTimeRange : DEFAULTS.timeRange),
    [rawTimeRange]
  );

  const rawRowsMode = p.get(PARAM.ROWS_MODE);
  const rowsMode = useMemo(
    (): RowsMode => (isRowsMode(rawRowsMode) ? rawRowsMode : DEFAULTS.rowsMode),
    [rawRowsMode]
  );

  const rawSortField = p.get(PARAM.SORT_FIELD);
  const sortField = useMemo(() => rawSortField || DEFAULTS.sortField, [rawSortField]);

  const rawSortDir = p.get(PARAM.SORT_DIR);
  const sortDirection = useMemo(
    (): 'asc' | 'desc' => (isSortDir(rawSortDir) ? rawSortDir : DEFAULTS.sortDirection),
    [rawSortDir]
  );

  const rawPage = p.get(PARAM.PAGE);
  const pageIndex = useMemo(
    () => (rawPage && isNonNegativeInt(rawPage) ? Number(rawPage) : DEFAULTS.pageIndex),
    [rawPage]
  );

  const rawPageSize = p.get(PARAM.PAGE_SIZE);
  const pageSize = useMemo(
    () => (rawPageSize && isPageSize(rawPageSize) ? Number(rawPageSize) : DEFAULTS.pageSize),
    [rawPageSize]
  );

  const rawEntityTypes = p.get(PARAM.ENTITY_TYPES) ?? '';
  const rawRiskLevels = p.get(PARAM.RISK_LEVELS) ?? '';
  const rawAssetCriticality = p.get(PARAM.ASSET_CRITICALITY) ?? '';
  const rawWatchlists = p.get(PARAM.WATCHLISTS) ?? '';
  const rawDataSources = p.get(PARAM.DATA_SOURCES) ?? '';
  const entityFilters = useMemo(
    (): EntityFilters => ({
      entityTypes: splitParam(rawEntityTypes).filter(isEntityType),
      riskLevels: splitParam(rawRiskLevels).filter(isRiskSeverity),
      assetCriticality: splitParam(rawAssetCriticality).filter(isCriticality),
      watchlists: splitParam(rawWatchlists),
      dataSources: splitParam(rawDataSources),
    }),
    [rawEntityTypes, rawRiskLevels, rawAssetCriticality, rawWatchlists, rawDataSources]
  );

  const rawExpanded = p.get(PARAM.EXPANDED);
  const expandedIds = useMemo(() => parseExpandedIds(rawExpanded), [rawExpanded]);

  const rawActiveTile = p.get(PARAM.ACTIVE_TILE);
  const activeTile = useMemo(
    (): SignalCardId | null => (isSignalCardId(rawActiveTile) ? rawActiveTile : null),
    [rawActiveTile]
  );

  // ── write ─────────────────────────────────────────────────────────────────

  const update = useCallback(
    (patch: (params: URLSearchParams) => void, { replace = false }: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(history.location.search);
      patch(params);
      const next = { ...history.location, search: params.toString() };
      if (replace) history.replace(next);
      else history.push(next);
    },
    [history]
  );

  const setTimeRange = useCallback(
    (val: TimeRange) =>
      update((params) => {
        params.set(PARAM.TIME_RANGE, val);
        params.delete(PARAM.PAGE);
      }),
    [update]
  );
  const setRowsMode = useCallback(
    (val: RowsMode) =>
      update((params) => {
        params.set(PARAM.ROWS_MODE, val);
        params.delete(PARAM.PAGE);
        params.delete(PARAM.EXPANDED);
        if (val === 'individual' && params.get(PARAM.SORT_FIELD) === GROUP_SIZE_FIELD) {
          params.set(PARAM.SORT_FIELD, DEFAULTS.sortField);
          params.set(PARAM.SORT_DIR, DEFAULTS.sortDirection);
        }
      }),
    [update]
  );
  const setSort = useCallback(
    (field: string, direction: 'asc' | 'desc') =>
      update((params) => {
        params.set(PARAM.SORT_FIELD, field);
        params.set(PARAM.SORT_DIR, direction);
        params.delete(PARAM.PAGE);
      }),
    [update]
  );
  const setPage = useCallback(
    (index: number) =>
      update((params) => {
        if (index === 0) params.delete(PARAM.PAGE);
        else params.set(PARAM.PAGE, String(index));
      }),
    [update]
  );
  const setPageSize = useCallback(
    (size: number) =>
      update((params) => {
        params.set(PARAM.PAGE_SIZE, String(size));
        params.delete(PARAM.PAGE);
      }),
    [update]
  );
  const setEntityFilters = useCallback(
    (next: EntityFilters) =>
      update((params) => {
        for (const [key, arr] of [
          [PARAM.ENTITY_TYPES, next.entityTypes],
          [PARAM.RISK_LEVELS, next.riskLevels],
          [PARAM.ASSET_CRITICALITY, next.assetCriticality],
          [PARAM.WATCHLISTS, next.watchlists],
          [PARAM.DATA_SOURCES, next.dataSources],
        ] as const) {
          if (arr.length) params.set(key, arr.join(','));
          else params.delete(key);
        }
        params.delete(PARAM.PAGE);
      }),
    [update]
  );
  const setActiveTile = useCallback(
    (tile: SignalCardId | null) =>
      update((params) => {
        if (tile == null) params.delete(PARAM.ACTIVE_TILE);
        else params.set(PARAM.ACTIVE_TILE, tile);
        params.delete(PARAM.PAGE);
      }),
    [update]
  );
  const resetGridQuery = useCallback(
    () =>
      update((params) => {
        params.delete(PARAM.ENTITY_TYPES);
        params.delete(PARAM.RISK_LEVELS);
        params.delete(PARAM.ASSET_CRITICALITY);
        params.delete(PARAM.WATCHLISTS);
        params.delete(PARAM.DATA_SOURCES);
        params.delete(PARAM.ACTIVE_TILE);
        params.set(PARAM.SORT_FIELD, DEFAULTS.sortField);
        params.set(PARAM.SORT_DIR, DEFAULTS.sortDirection);
        params.delete(PARAM.PAGE);
      }),
    [update]
  );
  const resetPage = useCallback(() => update((params) => params.delete(PARAM.PAGE)), [update]);

  const toggleExpandedId = useCallback(
    (entityId: string) =>
      update(
        (params) => {
          const current = parseExpandedIds(params.get(PARAM.EXPANDED));
          const next = current.includes(entityId)
            ? current.filter((id) => id !== entityId)
            : [...current.filter((id) => id !== entityId), entityId];
          writeExpandedParam(params, next);
        },
        { replace: true }
      ),
    [update]
  );

  const clearExpandedIds = useCallback(
    () => update((params) => params.delete(PARAM.EXPANDED), { replace: true }),
    [update]
  );

  return {
    timeRange,
    rowsMode,
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    entityFilters,
    expandedIds,
    activeTile,
    setTimeRange,
    setRowsMode,
    setSort,
    setPage,
    setPageSize,
    setEntityFilters,
    setActiveTile,
    resetGridQuery,
    resetPage,
    toggleExpandedId,
    clearExpandedIds,
  };
};
