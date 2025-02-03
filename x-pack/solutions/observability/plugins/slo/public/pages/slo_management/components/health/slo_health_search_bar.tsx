/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { observabilityAppId } from '@kbn/observability-plugin/public';
import React from 'react';
import { Filter } from '@kbn/es-query';
import { HEALTH_INDEX_PATTERN } from '../../../../../common/constants';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { useKibana } from '../../../../hooks/use_kibana';

interface Props {
  query?: string;
  filters?: Filter[];
  onSearchChange: (newQuery: string, newFilters: Filter[]) => void;
}

export function SloHealthSearchBar({
  query = '',

  filters = [],
  onSearchChange,
}: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { loading: isDataViewLoading, dataView } = useCreateDataView({
    indexPatternString: HEALTH_INDEX_PATTERN,
  });

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
        placeholder="Search your SLOs"
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={isDataViewLoading}
        query={{ query: String(query), language: 'kuery' }}
        onQuerySubmit={({ query: newQuery }) => {
          onSearchChange(String(newQuery?.query), filters);
        }}
        filters={filters}
        onFiltersUpdated={(newFilters) => {
          onSearchChange(query, newFilters);
        }}
        showSubmitButton={true}
        showDatePicker={false}
        showQueryInput={true}
        disableQueryLanguageSwitcher={true}
        allowSavingQueries
        onClearSavedQuery={() => {}}
        onSavedQueryUpdated={(savedQuery) => {
          onSearchChange(
            String(savedQuery.attributes.query.query),
            savedQuery.attributes.filters ?? []
          );
        }}
      />
    </div>
  );
}
