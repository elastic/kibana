/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebounceFn } from '@kbn/react-hooks';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query } from '@kbn/es-query';
import type { FilterManager, SavedQuery } from '@kbn/data-plugin/public';
import type { CreateWatchlistRequestBodyInput } from '../../../../common/api/entity_analytics/watchlists/management/create.gen';
import { PageScope } from '../../../data_view_manager/constants';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { QueryBar } from '../../../common/components/query_bar';
import { useKibana } from '../../../common/lib/kibana';
import { useFetchWatchlistIndices } from './hooks/use_fetch_watchlist_indices';
import {
  WATCHLIST_ENTITY_FIELD_ARIA_LABEL,
  WATCHLIST_ENTITY_FIELD_PLACEHOLDER,
  WATCHLIST_FILTER_QUERY_LABEL,
  WATCHLIST_IDENTIFY_ENTITIES_BY_LABEL,
  WATCHLIST_INDEX_PATTERN_LABEL,
  WATCHLIST_INDEX_PATTERN_PLACEHOLDER,
} from './translations';

/**
 * A single entity source entry from the entitySources array.
 */
type EntitySourceInput = NonNullable<CreateWatchlistRequestBodyInput['entitySources']>[number];

/** Derive the query string from an entity source (shared between init paths). */
const queryFromSource = (s?: EntitySourceInput): string =>
  (s?.queryRule ?? (s?.filter?.kuery as string) ?? '') as string;

/** Build index-pattern combo options from a comma-separated string. */
const indexPatternsFromSource = (s?: EntitySourceInput): Array<EuiComboBoxOptionOption<string>> =>
  s?.indexPattern ? s.indexPattern.split(',').map((p: string) => ({ label: p.trim() })) : [];

const getRuleToggleButtons = (
  isEditMode: boolean,
  isManaged: boolean,
  initialEntitySource?: EntitySourceInput
) => {
  // Only lock the toggle in edit mode so users can't switch source type on an existing entity source.
  // In create mode both buttons stay enabled even though onFieldChange sets initialEntitySource,
  // because isEditMode is explicitly false from the parent.
  // If the watchlist is managed, we allow editing both options even in edit mode.
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

/**
 * Real ES field names that can be used as the identifier field for index-type sources.
 * Each value must match an actual field in the user's index so the backend
 * terms query can correlate entities correctly.
 */
const ENTITY_FIELD_OPTIONS = [
  { value: 'host.name', inputDisplay: 'host.name' },
  { value: 'user.name', inputDisplay: 'user.name' },
  { value: 'service.name', inputDisplay: 'service.name' },
  { value: 'host.id', inputDisplay: 'host.id' },
  { value: 'user.email', inputDisplay: 'user.email' },
];

/**
 * Builds an entitySource payload for the IndexPattern mode.
 */
const buildIndexEntitySource = (
  watchlistName: string,
  patterns: Array<EuiComboBoxOptionOption<string>>,
  field: string,
  query: Query
): EntitySourceInput => {
  const indexPatternValue = patterns.map((opt) => opt.label).join(',');
  const sourceName = watchlistName
    ? `${watchlistName}-${indexPatternValue || 'index'}`
    : indexPatternValue || 'index-pattern-source';

  return {
    type: 'index',
    name: sourceName,
    indexPattern: indexPatternValue || undefined,
    identifierField: field || undefined,
    queryRule: (query.query as string) || undefined,
  };
};

const DEBOUNCE_OPTIONS = { wait: 300 };

interface FilterQueryRowProps {
  dataView: DataView | undefined;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: Filter[];
  onSubmitQuery: (query: Query) => void;
  onChangedQuery: (query: Query) => void;
  savedQuery: SavedQuery | undefined;
  onSavedQuery: (savedQuery: SavedQuery | undefined) => void;
}

const FilterQueryRow: FC<FilterQueryRowProps> = ({
  dataView,
  filterQuery,
  filterManager,
  filters,
  onSubmitQuery,
  onChangedQuery,
  savedQuery,
  onSavedQuery,
}) => (
  <EuiFormRow label={WATCHLIST_FILTER_QUERY_LABEL}>
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        {dataView ? (
          <QueryBar
            indexPattern={dataView}
            isRefreshPaused={true}
            filterQuery={filterQuery}
            filterManager={filterManager}
            filters={filters}
            onSubmitQuery={onSubmitQuery}
            onChangedQuery={onSubmitQuery}
            savedQuery={savedQuery}
            onSavedQuery={onSavedQuery}
            hideSavedQuery={false}
            displayStyle="inPage"
            dataTestSubj="watchlistFilterQuery"
          />
        ) : (
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.watchlists.flyout.filterQueryLoading"
              defaultMessage="Loading data view..."
            />
          </EuiText>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFormRow>
);

export interface RuleBasedSourceInputProps {
  watchlistName: string;
  isEditMode: boolean;
  isManaged?: boolean;
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
  initialEntitySources?: EntitySourceInput[];
}

export const RuleBasedSourceInput: React.FC<RuleBasedSourceInputProps> = ({
  watchlistName,
  isEditMode,
  isManaged = false,
  onFieldChange,
  initialEntitySources,
}) => {
  const {
    services: { data },
  } = useKibana();
  const { sourcererDataView } = useSourcererDataView(PageScope.default);

  // For non-managed: first source (existing single-source behaviour)
  // For managed: split sources by type so each toggle has its own state
  const initialEntitySource = isManaged ? undefined : initialEntitySources?.[0];
  const initialStoreSource = isManaged
    ? initialEntitySources?.find((s) => s.type === 'store')
    : undefined;
  const initialIndexSource = isManaged
    ? initialEntitySources?.find((s) => s.type === 'index')
    : undefined;

  // Derive initial values from the stored entity source (for edit mode)
  const initialRuleFilter = initialEntitySource?.type === 'index' ? 'indexPattern' : 'entityStore';
  const initialQuery: Query = { query: queryFromSource(initialEntitySource), language: 'kuery' };
  const initialIndexPatterns = indexPatternsFromSource(initialEntitySource);
  const initialEntityField = initialEntitySource?.identifierField ?? '';

  const [ruleFilter, setRuleFilter] = useState<string>(initialRuleFilter);
  const [dataView, setDataView] = useState<DataView>();
  const [filterQuery, setFilterQuery] = useState<Query>(initialQuery);
  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [entityField, setEntityField] = useState<string>(initialEntityField);
  const filterManager = data.query.filterManager;

  // Index pattern search state
  const [indexSearchQuery, setIndexSearchQuery] = useState<string | undefined>(undefined);
  const [selectedIndexPatterns, setSelectedIndexPatterns] =
    useState<Array<EuiComboBoxOptionOption<string>>>(initialIndexPatterns);
  const {
    data: indices,
    isFetching: isLoadingIndices,
    error: indicesError,
  } = useFetchWatchlistIndices(indexSearchQuery);
  const debouncedSetIndexSearchQuery = useDebounceFn(setIndexSearchQuery, DEBOUNCE_OPTIONS);

  const indexOptions = useMemo(() => indices?.map((index) => ({ label: index })) ?? [], [indices]);

  // --- Managed: per-type state saved in refs so toggling doesn't lose data ---
  const storeStateRef = useRef({
    filterQuery: { query: queryFromSource(initialStoreSource), language: 'kuery' } as Query,
  });
  const indexStateRef = useRef({
    filterQuery: { query: queryFromSource(initialIndexSource), language: 'kuery' } as Query,
    selectedIndexPatterns: indexPatternsFromSource(initialIndexSource),
    entityField: initialIndexSource?.identifierField ?? '',
  });

  // Track which types have been activated (either initially existed or user touched)
  const activeManagedTypes = useRef<Set<string>>(
    new Set([...(initialStoreSource ? ['store'] : []), ...(initialIndexSource ? ['index'] : [])])
  );

  // Sync internal state when initialEntitySource(s) arrive asynchronously (edit mode)
  const [hasInitialized, setHasInitialized] = useState(
    Boolean(initialEntitySource || initialStoreSource || initialIndexSource)
  );

  const hydrateManagedState = useCallback(() => {
    if (initialStoreSource) {
      storeStateRef.current = {
        filterQuery: { query: queryFromSource(initialStoreSource), language: 'kuery' },
      };
      activeManagedTypes.current.add('store');
    }
    if (initialIndexSource) {
      indexStateRef.current = {
        filterQuery: { query: queryFromSource(initialIndexSource), language: 'kuery' },
        selectedIndexPatterns: indexPatternsFromSource(initialIndexSource),
        entityField: initialIndexSource.identifierField ?? '',
      };
      activeManagedTypes.current.add('index');
    }
    const defaultToggle = initialStoreSource ? 'entityStore' : 'indexPattern';
    setRuleFilter(defaultToggle);
    if (defaultToggle === 'entityStore') {
      setFilterQuery(storeStateRef.current.filterQuery);
    } else {
      setFilterQuery(indexStateRef.current.filterQuery);
      setSelectedIndexPatterns(indexStateRef.current.selectedIndexPatterns);
      setEntityField(indexStateRef.current.entityField);
    }
  }, [initialStoreSource, initialIndexSource]);

  const hydrateNonManagedState = useCallback(() => {
    if (!initialEntitySource) return;
    setRuleFilter(initialEntitySource.type === 'index' ? 'indexPattern' : 'entityStore');
    setFilterQuery({ query: queryFromSource(initialEntitySource), language: 'kuery' });
    setEntityField(initialEntitySource.identifierField ?? '');
    if (initialEntitySource.indexPattern) {
      setSelectedIndexPatterns(indexPatternsFromSource(initialEntitySource));
    }
  }, [initialEntitySource]);

  useEffect(() => {
    if (hasInitialized) return;
    if (isManaged && (initialStoreSource || initialIndexSource)) {
      hydrateManagedState();
      setHasInitialized(true);
    } else if (!isManaged && initialEntitySource) {
      hydrateNonManagedState();
      setHasInitialized(true);
    }
  }, [
    initialEntitySource,
    initialStoreSource,
    initialIndexSource,
    isManaged,
    hasInitialized,
    hydrateManagedState,
    hydrateNonManagedState,
  ]);

  useEffect(() => {
    setFilters(filterManager.getFilters());
    const subscription = filterManager.getUpdates$().subscribe(() => {
      setFilters(filterManager.getFilters());
    });

    return () => subscription.unsubscribe();
  }, [filterManager]);

  // Create a DataView from the sourcerer spec (same pattern as AlertFiltersKqlBar)
  useEffect(() => {
    let dv: DataView;
    const createDataView = async () => {
      if (sourcererDataView) {
        dv = await data.dataViews.create(sourcererDataView);
        setDataView(dv);
      }
    };
    createDataView();

    return () => {
      if (dv?.id) {
        data.dataViews.clearInstanceCache(dv.id);
      }
    };
  }, [data.dataViews, sourcererDataView]);

  const buildEntityStoreSource = useCallback(
    (query: Query) => ({
      type: 'store' as const,
      name: watchlistName ? `${watchlistName}-store` : 'entity-store-filter',
      queryRule: (query.query as string) || undefined,
    }),
    [watchlistName]
  );

  /**
   * Emit the full entitySources array.
   * Non-managed: single source based on the active toggle.
   * Managed: one source per activated type (store, index, or both).
   */
  const emitSources = useCallback(
    ({
      activeFilter,
      query,
      patterns,
      field,
    }: {
      activeFilter: string;
      query: Query;
      patterns: Array<EuiComboBoxOptionOption<string>>;
      field: string;
    }) => {
      if (!isManaged) {
        // Non-managed: single source (existing behaviour)
        if (activeFilter === 'entityStore') {
          onFieldChange('entitySources', [buildEntityStoreSource(query)]);
        } else {
          onFieldChange('entitySources', [
            buildIndexEntitySource(watchlistName, patterns, field, query),
          ]);
        }
        return;
      }

      // Managed: build both sources from current + saved state
      // First, persist the live state into the right ref
      if (activeFilter === 'entityStore') {
        storeStateRef.current = { filterQuery: query };
      } else {
        indexStateRef.current = {
          filterQuery: query,
          selectedIndexPatterns: patterns,
          entityField: field,
        };
      }

      const sources: EntitySourceInput[] = [];
      if (activeManagedTypes.current.has('store')) {
        sources.push(buildEntityStoreSource(storeStateRef.current.filterQuery));
      }
      if (activeManagedTypes.current.has('index')) {
        sources.push(
          buildIndexEntitySource(
            watchlistName,
            indexStateRef.current.selectedIndexPatterns,
            indexStateRef.current.entityField,
            indexStateRef.current.filterQuery
          )
        );
      }

      onFieldChange('entitySources', sources.length > 0 ? sources : undefined);
    },
    [isManaged, onFieldChange, buildEntityStoreSource, watchlistName]
  );

  // onSubmitQuery is required by QueryBarComponent and fires on explicit submit (Enter/refresh).
  // We also pass it as onChangedQuery so the entity source updates in real-time as the user types.
  const onSubmitQuery = useCallback(
    (query: Query) => {
      setFilterQuery(query);
      // Mark the current toggle's type as active now that the user has modified data
      if (isManaged) {
        activeManagedTypes.current.add(ruleFilter === 'entityStore' ? 'store' : 'index');
      }
      emitSources({
        activeFilter: ruleFilter,
        query,
        patterns: selectedIndexPatterns,
        field: entityField,
      });
    },
    [emitSources, ruleFilter, selectedIndexPatterns, entityField, isManaged]
  );

  const onSavedQuery = useCallback((newSavedQuery: SavedQuery | undefined) => {
    setSavedQuery(newSavedQuery);
  }, []);

  const onRuleButtonChange = useCallback(
    (optionId: string) => {
      if (isManaged) {
        // Save current state into the ref for the type we're leaving
        const leavingType = ruleFilter === 'entityStore' ? 'store' : 'index';
        if (leavingType === 'store') {
          storeStateRef.current = { filterQuery };
        } else {
          indexStateRef.current = {
            filterQuery,
            selectedIndexPatterns,
            entityField,
          };
        }

        // Restore the incoming type's state (don't mark it as active yet —
        // that only happens when the user actually modifies data for this type)
        const enteringType = optionId === 'entityStore' ? 'store' : 'index';
        if (enteringType === 'store') {
          setFilterQuery(storeStateRef.current.filterQuery);
        } else {
          setFilterQuery(indexStateRef.current.filterQuery);
          setSelectedIndexPatterns(indexStateRef.current.selectedIndexPatterns);
          setEntityField(indexStateRef.current.entityField);
        }
      }

      setRuleFilter(optionId);

      if (!isManaged) {
        // Non-managed: emit immediately so the form state reflects the toggle change
        emitSources({
          activeFilter: optionId,
          query: filterQuery,
          patterns: selectedIndexPatterns,
          field: entityField,
        });
      }
      // Managed: no emit needed — each type is independent and the form
      // state only changes when the user modifies data (via onSubmitQuery, etc.)
    },
    [isManaged, ruleFilter, filterQuery, selectedIndexPatterns, entityField, emitSources]
  );

  const onIndexPatternsChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedIndexPatterns(selected);
      if (isManaged) {
        activeManagedTypes.current.add('index');
      }
      emitSources({
        activeFilter: ruleFilter,
        query: filterQuery,
        patterns: selected,
        field: entityField,
      });
    },
    [entityField, filterQuery, ruleFilter, emitSources, isManaged]
  );

  const onEntityFieldChange = useCallback(
    (value: string) => {
      setEntityField(value);
      if (isManaged) {
        activeManagedTypes.current.add('index');
      }
      emitSources({
        activeFilter: ruleFilter,
        query: filterQuery,
        patterns: selectedIndexPatterns,
        field: value,
      });
    },
    [selectedIndexPatterns, filterQuery, ruleFilter, emitSources, isManaged]
  );

  const isEntityStore = ruleFilter === 'entityStore';

  // For non-managed: lock the toggle so users can't switch an existing source's type.
  // For managed: both buttons are always enabled (each is its own source).
  const ruleToggleButtons = useMemo(
    () => getRuleToggleButtons(isEditMode, isManaged, initialEntitySource),
    [isEditMode, isManaged, initialEntitySource]
  );

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.flyout.ruleBasedDataSourcesTitle"
                defaultMessage="Rule Based Data Sources"
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.watchlists.flyout.ruleBasedDataSourcesDescription"
                defaultMessage="Define Watchlist data by filtering on existing entities in the store or filtering on entities from an indexPattern"
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiButtonGroup
          legend="Rule based data source type"
          options={ruleToggleButtons}
          idSelected={ruleFilter}
          onChange={onRuleButtonChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />

      {!isEntityStore && (
        <EuiFormRow label={WATCHLIST_INDEX_PATTERN_LABEL} fullWidth>
          <EuiComboBox
            isLoading={isLoadingIndices && !indicesError}
            fullWidth
            aria-label={WATCHLIST_INDEX_PATTERN_PLACEHOLDER}
            placeholder={WATCHLIST_INDEX_PATTERN_PLACEHOLDER}
            options={indexOptions}
            selectedOptions={selectedIndexPatterns}
            onChange={onIndexPatternsChange}
            isClearable={true}
            onSearchChange={(query) => {
              debouncedSetIndexSearchQuery.run(query);
            }}
            async
            optionMatcher={() => false}
            data-test-subj="watchlistIndexPatternComboBox"
          />
        </EuiFormRow>
      )}

      <FilterQueryRow
        dataView={dataView}
        filterQuery={filterQuery}
        filterManager={filterManager}
        filters={filters}
        onSubmitQuery={onSubmitQuery}
        onChangedQuery={onSubmitQuery}
        savedQuery={savedQuery}
        onSavedQuery={onSavedQuery}
      />

      {!isEntityStore && (
        <EuiFormRow label={WATCHLIST_IDENTIFY_ENTITIES_BY_LABEL}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiSuperSelect
                valueOfSelected={entityField}
                placeholder={WATCHLIST_ENTITY_FIELD_PLACEHOLDER}
                options={ENTITY_FIELD_OPTIONS}
                onChange={onEntityFieldChange}
                aria-label={WATCHLIST_ENTITY_FIELD_ARIA_LABEL}
                style={{ width: 240 }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </>
  );
};
