/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiText } from '@elastic/eui';
import { observabilityAppId } from '@kbn/observability-shared-plugin/common';
import { useFetchSLOSuggestions } from '../../slo_edit/hooks/use_fetch_suggestions';
import { useKibana } from '../../../hooks/use_kibana';
import { useUrlSearchState } from '../hooks/use_url_search_state';

interface Props {
  onRefresh: () => void;
}

export function SloManagementSearchBar({ onRefresh }: Props) {
  const { state, onStateChange } = useUrlSearchState();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { suggestions } = useFetchSLOSuggestions();
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );

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
      query={{ query: state.search, language: 'text' }}
      onQuerySubmit={({ query: value }) => {
        onStateChange({ search: String(value?.query ?? '') });
        onRefresh();
      }}
      renderQueryInputAppend={() => (
        <>
          <EuiComboBox
            compressed
            aria-label={filterTagsLabel}
            placeholder={filterTagsLabel}
            delimiter=","
            options={suggestions?.tags ? [existOption, ...suggestions?.tags] : []}
            selectedOptions={selectedOptions}
            onChange={(newOptions) => {
              setSelectedOptions(newOptions);
              onStateChange({ tags: newOptions.map((option) => String(option.value)) });
            }}
            isClearable={true}
            data-test-subj="filter-slos-by-tag"
          />
        </>
      )}
    />
  );
}

const filterTagsLabel = i18n.translate('xpack.slo.sloDefinitions.filterByTag', {
  defaultMessage: 'Filter tags',
});

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
