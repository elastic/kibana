/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useFetchSLOSuggestions } from '../../slo_edit/hooks/use_fetch_suggestions';

interface Props {
  initialSearch?: string;
  filters: {
    search: string;
    tags: EuiComboBoxOptionOption[];
  };
  setFilters: Function;
  onRefresh: () => void;
}

export function SloManagementSearchBar({
  initialSearch = '',
  filters,
  setFilters,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState<string>(initialSearch);
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>(filters.tags);

  const { suggestions } = useFetchSLOSuggestions();

  const refreshSearch = () => {
    setFilters({
      search,
      tags: [...selectedOptions],
    });
    onRefresh();
  };

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setSearch(event.target.value);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      refreshSearch();
    }
  };

  const searchCanBeUpdated =
    filters.search !== search ||
    filters?.tags?.length !== selectedOptions?.length ||
    filters?.tags.some((el, index) => selectedOptions[index] !== el);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={10}>
        <EuiFieldSearch
          data-test-subj="o11ySloDefinitionsFieldSearch"
          fullWidth
          value={search}
          onChange={handleFieldChange}
          onKeyDown={handleKeyPress}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <EuiComboBox
          aria-label={i18n.translate('xpack.slo.sloDefinitions.filterByTag', {
            defaultMessage: 'Filter tags',
          })}
          placeholder={i18n.translate('xpack.slo.sloDefinitions.filterByTag', {
            defaultMessage: 'Filter tags',
          })}
          fullWidth
          options={suggestions?.tags ?? []}
          selectedOptions={selectedOptions}
          onChange={(newOptions) => {
            setSelectedOptions(newOptions);
          }}
          isClearable={true}
          data-test-subj="demoComboBox"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        {searchCanBeUpdated ? (
          <EuiButton
            data-test-subj="o11ySloDefinitionsUpdateButton"
            iconType="kqlFunction"
            color="success"
            fill
            onClick={refreshSearch}
          >
            {i18n.translate('xpack.slo.sloDefinitions.updateButtonLabel', {
              defaultMessage: 'Update',
            })}
          </EuiButton>
        ) : (
          <EuiButton
            data-test-subj="o11ySloDefinitionsRefreshButton"
            iconType="refresh"
            onClick={refreshSearch}
          >
            {i18n.translate('xpack.slo.sloDefinitions.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
