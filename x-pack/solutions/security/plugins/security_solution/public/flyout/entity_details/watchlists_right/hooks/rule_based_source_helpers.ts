/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';

/** A single entity source entry from the entitySources array. */
export type EntitySourceInput = NonNullable<
  CreateWatchlistRequestBodyInput['entitySources']
>[number];

export type ToggleId = 'none' | 'entityStore' | 'indexPattern';
export type SourceType = 'store' | 'index';

export const DEFAULT_RANGE = { start: 'now-10d', end: 'now' };

/** State kept independently for each source type. */
export interface PerTypeState {
  filterQuery: Query;
  indexPatterns: Array<EuiComboBoxOptionOption<string>>;
  entityField: string;
  range: { start: string; end: string };
  /** True once the user (or hydration) has supplied data for this type. */
  dirty: boolean;
}

/** Initial sources split by type for the hook to consume. */
export interface InitialByType {
  store: EntitySourceInput | undefined;
  index: EntitySourceInput | undefined;
}

export const EMPTY_QUERY: Query = { query: '', language: 'kuery' };

/** Real ES field names used as the identifier field for index-type sources. */
export const ENTITY_FIELD_OPTIONS = [
  { value: 'host.name', inputDisplay: 'host.name' },
  { value: 'user.name', inputDisplay: 'user.name' },
  { value: 'service.name', inputDisplay: 'service.name' },
  { value: 'host.id', inputDisplay: 'host.id' },
  { value: 'user.email', inputDisplay: 'user.email' },
];

export const toggleToType = (id: ToggleId): SourceType | undefined => {
  if (id === 'entityStore') return 'store';
  if (id === 'indexPattern') return 'index';
  return undefined;
};

/** Extract the query string from a persisted entity source. */
export const queryFromSource = (s?: EntitySourceInput): string =>
  (s?.queryRule ?? (s?.filter?.kuery as string) ?? '') as string;

/** Build combo-box options from a comma-separated index-pattern string. */
export const indexPatternsFromSource = (
  s?: EntitySourceInput
): Array<EuiComboBoxOptionOption<string>> =>
  s?.indexPattern ? s.indexPattern.split(',').map((p: string) => ({ label: p.trim() })) : [];

/** Convert a persisted entity source into per-type form state. */
export const stateFromSource = (s?: EntitySourceInput): PerTypeState => ({
  filterQuery: s ? { query: queryFromSource(s), language: 'kuery' } : EMPTY_QUERY,
  indexPatterns: indexPatternsFromSource(s),
  entityField: s?.identifierField ?? '',
  range: s?.range ?? DEFAULT_RANGE,
  dirty: false,
});

export const buildStoreSource = (
  state: PerTypeState,
  watchlistName: string
): EntitySourceInput => ({
  type: 'store',
  name: watchlistName ? `${watchlistName}-store` : 'entity-store-filter',
  queryRule: (state.filterQuery.query as string) || undefined,
});

export const buildIndexSource = (state: PerTypeState, watchlistName: string): EntitySourceInput => {
  const patternValue = state.indexPatterns.map((o) => o.label).join(',');
  const sourceName = watchlistName
    ? `${watchlistName}-${patternValue || 'index'}`
    : patternValue || 'index-pattern-source';

  return {
    type: 'index',
    name: sourceName,
    indexPattern: patternValue || undefined,
    identifierField: state.entityField || undefined,
    queryRule: (state.filterQuery.query as string) || undefined,
    range: state.range,
  };
};

const buildSource = (type: SourceType, state: PerTypeState, name: string): EntitySourceInput =>
  type === 'store' ? buildStoreSource(state, name) : buildIndexSource(state, name);

/**
 * Split an initial entity-sources array into { store, index } by type.
 * For non-managed watchlists the first source is used as-is.
 */
export const splitInitialSources = (
  isManaged: boolean,
  sources?: EntitySourceInput[]
): InitialByType => {
  if (isManaged) {
    return {
      store: sources?.find((s) => s.type === 'store'),
      index: sources?.find((s) => s.type === 'index'),
    };
  }
  const single = sources?.[0];
  if (!single) return { store: undefined, index: undefined };
  return {
    store: single.type !== 'index' ? single : undefined,
    index: single.type === 'index' ? single : undefined,
  };
};

/** Pick the default toggle based on which initial sources exist. */
export const computeDefaultToggle = (initial: InitialByType): ToggleId => {
  if (initial.index) return 'indexPattern';
  if (initial.store) return 'entityStore';
  return 'none';
};

/**
 * Build the entitySources array that gets written into the form state.
 *
 * Non-managed: exactly one source matching the active toggle.
 * Managed: one source per dirty type (store, index, or both).
 */
export const buildEntitySources = (
  states: Record<SourceType, PerTypeState>,
  toggle: ToggleId,
  isManaged: boolean,
  watchlistName: string
): EntitySourceInput[] | undefined => {
  const type = toggleToType(toggle);

  // "None" selected — explicitly clear all sources for both managed and non-managed
  if (!type) return [];

  if (!isManaged) {
    return [buildSource(type, states[type], watchlistName)];
  }

  const builders = [
    [states.store, buildStoreSource],
    [states.index, buildIndexSource],
  ] as const;

  const sources = builders
    .filter(([state]) => state.dirty)
    .map(([state, build]) => build(state, watchlistName));

  return sources.length ? sources : undefined;
};

export const getToggleButtons = () => {
  return [
    {
      id: 'none',
      label: 'None',
    },
    {
      id: 'entityStore',
      label: 'Entity Store',
    },
    {
      id: 'indexPattern',
      label: 'IndexPattern',
    },
  ];
};

const hasFilterQuery = (state: PerTypeState): boolean =>
  Boolean((state.filterQuery.query as string)?.trim());

/**
 * Validates that all required rule-based fields are filled for the active source type.
 * - Entity store: filter is required
 * - Index pattern: index pattern, filter, lookback period, and entity field are required
 */
export const validateRuleBasedSource = (
  toggle: ToggleId,
  states: Record<SourceType, PerTypeState>
): { isValid: boolean; errors: Partial<Record<string, boolean>> } => {
  const type = toggleToType(toggle);
  if (!type) return { isValid: true, errors: {} };
  const state = states[type];

  if (type === 'store') {
    const filterMissing = !hasFilterQuery(state);
    return {
      isValid: !filterMissing,
      errors: { filterQuery: filterMissing },
    };
  }

  // index type
  const indexPatternMissing = state.indexPatterns.length === 0;
  const filterMissing = !hasFilterQuery(state);
  const rangeMissing = !state.range?.start || !state.range?.end;
  const entityFieldMissing = !state.entityField;

  return {
    isValid: !indexPatternMissing && !filterMissing && !rangeMissing && !entityFieldMissing,
    errors: {
      indexPattern: indexPatternMissing,
      filterQuery: filterMissing,
      range: rangeMissing,
      entityField: entityFieldMissing,
    },
  };
};
