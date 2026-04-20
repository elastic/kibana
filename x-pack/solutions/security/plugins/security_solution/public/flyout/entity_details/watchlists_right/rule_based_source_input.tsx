/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';
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
import { QueryBar } from '../../../common/components/query_bar';
import { useFetchWatchlistIndices } from './hooks/use_fetch_watchlist_indices';
import { useRuleBasedSourceState, ENTITY_FIELD_OPTIONS } from './hooks/use_rule_based_source_state';
import { useDataViewSetup } from './hooks/use_data_view_setup';
import {
  WATCHLIST_ENTITY_FIELD_ARIA_LABEL,
  WATCHLIST_ENTITY_FIELD_PLACEHOLDER,
  WATCHLIST_FILTER_QUERY_LABEL,
  WATCHLIST_IDENTIFY_ENTITIES_BY_LABEL,
  WATCHLIST_INDEX_PATTERN_LABEL,
  WATCHLIST_INDEX_PATTERN_PLACEHOLDER,
} from './translations';

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
  isEditMode: boolean;
  isManaged?: boolean;
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
  initialEntitySources?: CreateWatchlistRequestBodyInput['entitySources'];
}

export const RuleBasedSourceInput: React.FC<RuleBasedSourceInputProps> = ({
  watchlistName,
  isEditMode,
  isManaged = false,
  onFieldChange,
  initialEntitySources,
}) => {
  const { dataView, filters, filterManager } = useDataViewSetup();

  const {
    filterQuery,
    selectedIndexPatterns,
    entityField,
    isEntityStore,
    savedQuery,
    toggleButtons,
    activeToggle,
    onToggleChange,
    onQueryChange,
    onSavedQueryChange,
    onIndexPatternsChange,
    onEntityFieldChange,
  } = useRuleBasedSourceState({
    watchlistName,
    isEditMode,
    isManaged,
    initialEntitySources,
    onFieldChange,
  });

  const [indexSearchQuery, setIndexSearchQuery] = React.useState<string | undefined>(undefined);
  const {
    data: indices,
    isFetching: isLoadingIndices,
    error: indicesError,
  } = useFetchWatchlistIndices(indexSearchQuery);
  const debouncedSetIndexSearchQuery = useDebounceFn(setIndexSearchQuery, DEBOUNCE_OPTIONS);
  const indexOptions = useMemo(() => indices?.map((index) => ({ label: index })) ?? [], [indices]);

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
          options={toggleButtons}
          idSelected={activeToggle}
          onChange={onToggleChange}
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
            onSearchChange={(query) => debouncedSetIndexSearchQuery.run(query)}
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
        onSubmitQuery={onQueryChange}
        onChangedQuery={onQueryChange}
        savedQuery={savedQuery}
        onSavedQuery={onSavedQueryChange}
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
