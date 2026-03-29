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
 * Maps each dropdown option to the actual field(s) it represents.
 * Composite options (e.g. entity.name) expand to multiple fields
 * that are OR-ed together in the request.
 */
const ENTITY_FIELD_MAP: Record<string, string[]> = {
  'entity.name': ['user.name', 'service.name', 'host.name'],
  'host.id': ['host.id'],
  'user.email': ['user.email'],
  'entity.id': ['entity.id'],
};

const ENTITY_FIELD_OPTIONS = Object.keys(ENTITY_FIELD_MAP).map((key) => ({
  value: key,
  inputDisplay: key,
}));

/**
 * Resolves a selected dropdown value to the underlying field(s).
 * e.g. 'entity.name' → ['user.name', 'service.name', 'host.name']
 */
export const getIdentifierFields = (selected: string): string[] =>
  ENTITY_FIELD_MAP[selected] ?? [selected];

const DEBOUNCE_OPTIONS = { wait: 300 };

interface FilterQueryRowProps {
  dataView: DataView | undefined;
  filterQuery: Query;
  filterManager: FilterManager;
  filters: Filter[];
  onSubmitQuery: (query: Query) => void;
  savedQuery: SavedQuery | undefined;
  onSavedQuery: (savedQuery: SavedQuery | undefined) => void;
}

const FilterQueryRow: FC<FilterQueryRowProps> = ({
  dataView,
  filterQuery,
  filterManager,
  filters,
  onSubmitQuery,
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

export const RuleBasedSourceInput: React.FC = () => {
  const {
    services: { data },
  } = useKibana();

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

  useEffect(() => {
    let isSubscribed = true;
    const loadDefaultDataView = async () => {
      const defaultDataView = await data.dataViews.getDefaultDataView();
      if (isSubscribed && defaultDataView) {
        setDataView(defaultDataView);
      }
    };

    loadDefaultDataView();

    return () => {
      isSubscribed = false;
    };
  }, [data.dataViews]);

  const onSubmitQuery = useCallback((query: Query) => {
    setFilterQuery(query);
  }, []);

  const onSavedQuery = useCallback((newSavedQuery: SavedQuery | undefined) => {
    setSavedQuery(newSavedQuery);
  }, []);

  const onRuleButtonChange = useCallback((optionId: string) => {
    setRuleFilter(optionId);
  }, []);

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
            onChange={setSelectedIndexPatterns}
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
                onChange={(value) => setEntityField(value)}
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
