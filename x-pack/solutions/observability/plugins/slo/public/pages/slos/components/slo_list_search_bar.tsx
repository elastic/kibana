/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { observabilityAppId } from '@kbn/observability-plugin/public';
import React, { useEffect } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useSloCrudLoading } from '../hooks/use_crud_loading';
import { useSloSummaryDataView } from '../hooks/use_summary_dataview';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { QuickFilters } from './common/quick_filters';

export function SloListSearchBar() {
  const {
    data: { query },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { state, onStateChange } = useUrlSearchState();
  const isSloCrudLoading = useSloCrudLoading();

  const { isLoading: isDataViewLoading, data: dataView } = useSloSummaryDataView();

  useEffect(() => {
    const sub = query.state$.subscribe(() => {
      const queryState = query.getState();
      onStateChange({
        kqlQuery: String((queryState.query as Query).query),
        filters: queryState.filters,
      });
    });

    return () => sub.unsubscribe();
  }, [onStateChange, query]);

  return (
    <div
      css={css`
        .uniSearchBar {
          padding: 0;
        }
      `}
    >
      <SearchBar
        appName={observabilityAppId}
        placeholder={PLACEHOLDER}
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={isSloCrudLoading}
        renderQueryInputAppend={() => (
          <QuickFilters
            dataView={dataView}
            initialState={state}
            loading={isSloCrudLoading || isDataViewLoading}
            onStateChange={onStateChange}
          />
        )}
        filters={state.filters}
        onFiltersUpdated={(newFilters) => {
          onStateChange({ filters: newFilters });
        }}
        onQuerySubmit={({ query: value }) => {
          onStateChange({ kqlQuery: String(value?.query), lastRefresh: Date.now() });
        }}
        query={{ query: String(state.kqlQuery), language: 'kuery' }}
        showSubmitButton={true}
        showDatePicker={false}
        showQueryInput={true}
        disableQueryLanguageSwitcher={true}
        allowSavingQueries
        onClearSavedQuery={() => {}}
        onSavedQueryUpdated={(savedQuery) => {
          onStateChange({
            filters: savedQuery.attributes.filters,
            kqlQuery: String(savedQuery.attributes.query.query),
          });
        }}
      />
    </div>
  );
}

const PLACEHOLDER = i18n.translate('xpack.slo.list.search', {
  defaultMessage: 'Search your SLOs ...',
});
