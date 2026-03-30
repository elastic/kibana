/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';
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

const RULE_TOGGLE_BUTTONS = [
  {
    id: 'entityStore',
    label: 'Entity Store',
  },
  {
    id: 'indexPattern',
    label: 'IndexPattern',
  },
];

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
): CreateWatchlistRequestBodyInput['entitySource'] => {
  const indexPatternValue = patterns.map((opt) => opt.label).join(',');
  const sourceName = watchlistName
    ? `${watchlistName}-${indexPatternValue || 'index'}`
    : indexPatternValue || 'index-pattern-source';

  return {
    type: 'index',
    name: sourceName,
    indexPattern: indexPatternValue || undefined,
    identifierField: field || undefined,
    filter: query.query ? { kuery: query.query as string } : undefined,
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
            onChangedQuery={onChangedQuery}
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
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
}

export const RuleBasedSourceInput: React.FC<RuleBasedSourceInputProps> = ({
  watchlistName,
  onFieldChange,
}) => {
  const {
    services: { data },
  } = useKibana();
  const { sourcererDataView } = useSourcererDataView(PageScope.default);

  const [ruleFilter, setRuleFilter] = useState<string>('entityStore');
  const [dataView, setDataView] = useState<DataView>();
  const [filterQuery, setFilterQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [entityField, setEntityField] = useState<string>('');
  const filterManager = data.query.filterManager;

  // Index pattern search state
  const [indexSearchQuery, setIndexSearchQuery] = useState<string | undefined>(undefined);
  const [selectedIndexPatterns, setSelectedIndexPatterns] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const {
    data: indices,
    isFetching: isLoadingIndices,
    error: indicesError,
  } = useFetchWatchlistIndices(indexSearchQuery);
  const debouncedSetIndexSearchQuery = useDebounceFn(setIndexSearchQuery, DEBOUNCE_OPTIONS);

  const indexOptions = useMemo(() => indices?.map((index) => ({ label: index })) ?? [], [indices]);

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
      filter: query.query ? { kuery: query.query as string } : undefined,
    }),
    [watchlistName]
  );

  const updateEntitySource = useCallback(
    (query: Query) => {
      if (ruleFilter === 'entityStore') {
        onFieldChange('entitySource', buildEntityStoreSource(query));
      } else {
        onFieldChange(
          'entitySource',
          buildIndexEntitySource(watchlistName, selectedIndexPatterns, entityField, query)
        );
      }
    },
    [
      ruleFilter,
      onFieldChange,
      buildEntityStoreSource,
      watchlistName,
      selectedIndexPatterns,
      entityField,
    ]
  );

  const onSubmitQuery = useCallback(
    (query: Query) => {
      setFilterQuery(query);
      updateEntitySource(query);
    },
    [updateEntitySource]
  );

  const onChangedQuery = useCallback(
    (query: Query) => {
      setFilterQuery(query);
      updateEntitySource(query);
    },
    [updateEntitySource]
  );

  const onSavedQuery = useCallback((newSavedQuery: SavedQuery | undefined) => {
    setSavedQuery(newSavedQuery);
  }, []);

  const onRuleButtonChange = useCallback(
    (optionId: string) => {
      setRuleFilter(optionId);
      if (optionId === 'entityStore') {
        // Immediately send entity store source with current filter
        onFieldChange('entitySource', buildEntityStoreSource(filterQuery));
      } else {
        // Immediately send index source with current state
        onFieldChange(
          'entitySource',
          buildIndexEntitySource(watchlistName, selectedIndexPatterns, entityField, filterQuery)
        );
      }
    },
    [
      onFieldChange,
      buildEntityStoreSource,
      filterQuery,
      watchlistName,
      selectedIndexPatterns,
      entityField,
    ]
  );

  const onIndexPatternsChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedIndexPatterns(selected);
      onFieldChange(
        'entitySource',
        buildIndexEntitySource(watchlistName, selected, entityField, filterQuery)
      );
    },
    [entityField, filterQuery, onFieldChange, watchlistName]
  );

  const onEntityFieldChange = useCallback(
    (value: string) => {
      setEntityField(value);
      onFieldChange(
        'entitySource',
        buildIndexEntitySource(watchlistName, selectedIndexPatterns, value, filterQuery)
      );
    },
    [selectedIndexPatterns, filterQuery, onFieldChange, watchlistName]
  );

  const isEntityStore = ruleFilter === 'entityStore';

  return (
    <>
      <EuiFormRow>
        <EuiButtonGroup
          legend="Rule based data source type"
          options={RULE_TOGGLE_BUTTONS}
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
        onChangedQuery={onChangedQuery}
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
