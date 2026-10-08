/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { getEntityAnalyticsEntityTypes } from '../../../../../../common/entity_analytics/utils';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import { SEVERITY_UI_SORT_ORDER } from '../../../../common/utils';
import { ValidCriticalityLevels } from '../../../../../../common/entity_analytics/asset_criticality/constants';
import {
  GROUP_SIZE_FIELD,
  RISK_SCORE_NORM_FIELD,
  PAGE_SIZE_OPTIONS,
  TIME_RANGE_OPTIONS,
} from '../common';
import type { RowsMode, SortDir, TimeRange } from '../common';
import { findSortQuerySpec } from '../grid_columns';
import { isSignalCardId, type SignalCardId } from '../../needs_attention_tiles/data';

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
  ENTITY_TYPES: 'eaEntityTypes',
  RISK_LEVELS: 'eaRiskLevels',
  ASSET_CRITICALITY: 'eaAssetCriticality',
  WATCHLISTS: 'eaWatchlists',
  DATA_SOURCES: 'eaDataSources',
} as const;

/** Caps URL length; most recently expanded ids are kept. */
export const MAX_EXPANDED_ENTITY_IDS = 20;

// ── defaults ──────────────────────────────────────────────────────────────────

const DEFAULTS = {
  timeRange: '30d',
  rowsMode: 'resolved',
  sortField: RISK_SCORE_NORM_FIELD,
  sortDirection: 'desc',
  pageIndex: 0,
  pageSize: PAGE_SIZE_OPTIONS[0],
} as const satisfies {
  timeRange: TimeRange;
  rowsMode: RowsMode;
  sortField: string;
  sortDirection: SortDir;
  pageIndex: number;
  pageSize: number;
};

// ── validators ────────────────────────────────────────────────────────────────

const VALID_ENTITY_TYPES = new Set<string>(getEntityAnalyticsEntityTypes());
const VALID_RISK_LEVELS = new Set<string>(SEVERITY_UI_SORT_ORDER);
const VALID_CRITICALITY = new Set<string>(ValidCriticalityLevels);

const isTimeRange = (v: string | null): v is TimeRange =>
  TIME_RANGE_OPTIONS.includes(v as TimeRange);
const isRowsMode = (v: string | null): v is RowsMode => v === 'resolved' || v === 'individual';
const isSortDir = (v: string | null): v is SortDir => v === 'asc' || v === 'desc';
/** Group size has no meaning for individual rows, so it is not a valid sort there. */
const isValidSortField = (field: string | null, rowsMode: RowsMode): field is string =>
  field != null &&
  findSortQuerySpec(field) != null &&
  !(rowsMode === 'individual' && field === GROUP_SIZE_FIELD);
const isNonNegativeInt = (v: string | null): boolean =>
  v != null && /^\d+$/.test(v) && Number(v) >= 0;
const isPageSize = (v: string | null): boolean =>
  v != null && (PAGE_SIZE_OPTIONS as readonly number[]).includes(Number(v));

const isEntityType = (v: string): v is EntityType => VALID_ENTITY_TYPES.has(v);
const isRiskSeverity = (v: string): v is RiskSeverity => VALID_RISK_LEVELS.has(v);
const isCriticality = (v: string): boolean => VALID_CRITICALITY.has(v);

const splitParam = (raw: string) => raw.split(',').filter(Boolean);

/** Expanded ids, one `eaExpanded` param each: ids can contain commas. */
const readExpandedIds = (params: URLSearchParams): string[] =>
  params.getAll(PARAM.EXPANDED).filter(Boolean).slice(-MAX_EXPANDED_ENTITY_IDS);

const writeExpandedIds = (params: URLSearchParams, ids: string[]) => {
  params.delete(PARAM.EXPANDED);
  for (const id of ids.slice(-MAX_EXPANDED_ENTITY_IDS)) params.append(PARAM.EXPANDED, id);
};

// ── types ─────────────────────────────────────────────────────────────────────

export interface EntityAnalyticsUrlState {
  timeRange: TimeRange;
  rowsMode: RowsMode;
  sortField: string;
  sortDirection: SortDir;
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
  setSort: (field: string, direction: SortDir) => void;
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

/**
 * The page state in the URL. A param that is missing or invalid reads as its default, and
 * the URL only carries what the user changed.
 */
export const useEntityAnalyticsUrlState = (): EntityAnalyticsUrlStateResult => {
  const { search } = useLocation();
  const history = useHistory();

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

  // An invalid sort field reads as the default sort, direction included.
  const rawSortField = p.get(PARAM.SORT_FIELD);
  const isSortFieldValid = isValidSortField(rawSortField, rowsMode);
  const sortField = isSortFieldValid ? rawSortField : DEFAULTS.sortField;

  const rawSortDir = p.get(PARAM.SORT_DIR);
  const sortDirection = useMemo(
    (): SortDir =>
      isSortFieldValid && isSortDir(rawSortDir) ? rawSortDir : DEFAULTS.sortDirection,
    [isSortFieldValid, rawSortDir]
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

  const expandedIds = useMemo(() => readExpandedIds(p), [p]);

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
      const nextSearch = params.toString();
      // A no-op push would add a duplicate history entry, so Back would seem to do nothing.
      if (nextSearch === new URLSearchParams(history.location.search).toString()) return;
      const next = { ...history.location, search: nextSearch };
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
    (field: string, direction: SortDir) =>
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
  const resetPage = useCallback(
    () => update((params) => params.delete(PARAM.PAGE), { replace: true }),
    [update]
  );

  const toggleExpandedId = useCallback(
    (entityId: string) =>
      update(
        (params) => {
          const current = readExpandedIds(params);
          const next = current.includes(entityId)
            ? current.filter((id) => id !== entityId)
            : [...current.filter((id) => id !== entityId), entityId];
          writeExpandedIds(params, next);
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
