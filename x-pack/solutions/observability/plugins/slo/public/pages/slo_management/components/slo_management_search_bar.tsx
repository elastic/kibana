/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiText } from '@elastic/eui';
import { observabilityAppId } from '@kbn/observability-shared-plugin/common';
import { useFetchSLOSuggestions } from '../../slo_edit/hooks/use_fetch_suggestions';
import { useKibana } from '../../../hooks/use_kibana';

interface Props {
  filters: {
    search: string;
    tags: EuiComboBoxOptionOption[];
  };
  setFilters: Function;
  onRefresh: () => void;
}

export function SloManagementSearchBar({ filters, setFilters, onRefresh }: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { suggestions } = useFetchSLOSuggestions();

  return (
    <SearchBar
      appName={observabilityAppId}
      placeholder={i18n.translate('xpack.slo.sloDefinitions.filterByName', {
        defaultMessage: 'Filter by name',
      })}
      isAutoRefreshDisabled
      disableQueryLanguageSwitcher
      nonKqlMode="text"
      showQueryMenu={false}
      showDatePicker={false}
      showSavedQueryControls={false}
      showFilterBar={false}
      onQuerySubmit={({ query: value }) => {
        setFilters({ search: value?.query, tags: filters.tags });
      }}
      onRefresh={onRefresh}
      query={{ query: filters.search, language: 'text' }}
      renderQueryInputAppend={() => (
        <EuiComboBox
          aria-label={i18n.translate('xpack.slo.sloDefinitions.filterByTag', {
            defaultMessage: 'Filter tags',
          })}
          placeholder={i18n.translate('xpack.slo.sloDefinitions.filterByTag', {
            defaultMessage: 'Filter tags',
          })}
          singleSelection={!!filters.tags.find((option) => option.value === '*')}
          delimiter=","
          options={suggestions?.tags ? [existOption, ...suggestions?.tags] : []}
          selectedOptions={filters.tags}
          onChange={(newOptions) => {
            setFilters({ search: filters.search, tags: newOptions });
          }}
          isClearable={true}
          data-test-subj="filter-slos-by-tag"
        />
      )}
    />
  );
}

const existOption = {
  prepend: (
    <EuiText size="s">
      <strong>
        <em>
          {i18n.translate('xpack.slo.sloDefinitions.tagOptions.exists', {
            defaultMessage: 'Exists',
          })}
        </em>
      </strong>
    </EuiText>
  ),
  label: '',
  value: '*',
};
