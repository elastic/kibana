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

export type ToggleId = 'entityStore' | 'indexPattern';
export type SourceType = 'store' | 'index';

/** State kept independently for each source type. */
export interface PerTypeState {
  filterQuery: Query;
  indexPatterns: Array<EuiComboBoxOptionOption<string>>;
  entityField: string;
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

export const toggleToType = (id: ToggleId): SourceType =>
  id === 'entityStore' ? 'store' : 'index';

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
  dirty: Boolean(s),
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
export const computeDefaultToggle = (initial: InitialByType): ToggleId =>
  initial.index && !initial.store ? 'indexPattern' : 'entityStore';

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
  if (!isManaged) {
    const type = toggleToType(toggle);
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

export const getToggleButtons = (
  isEditMode: boolean,
  isManaged: boolean,
  initialEntitySource?: EntitySourceInput
) => {
  // Lock the toggle in edit mode for non-managed watchlists so users can't
  // switch an existing source's type.  Managed watchlists keep both enabled.
  const lockedType = initialEntitySource?.type === 'index' ? 'indexPattern' : 'entityStore';
  return [
    {
      id: 'entityStore',
      label: 'Entity Store',
      isDisabled: isEditMode && !isManaged && lockedType !== 'entityStore',
    },
    {
      id: 'indexPattern',
      label: 'IndexPattern',
      isDisabled: isEditMode && !isManaged && lockedType !== 'indexPattern',
    },
  ];
};
