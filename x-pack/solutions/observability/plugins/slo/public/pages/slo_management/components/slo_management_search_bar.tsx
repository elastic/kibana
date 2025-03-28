/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SLODefinitionVersions } from '@kbn/slo-schema';
import { EuiComboBox, EuiComboBoxOptionOption, EuiText } from '@elastic/eui';
import { observabilityAppId } from '@kbn/observability-shared-plugin/common';
import { useFetchSLOSuggestions } from '../../slo_edit/hooks/use_fetch_suggestions';
import { useKibana } from '../../../hooks/use_kibana';
import { SearchState } from './hooks/use_url_search_state';

interface Props {
  initialVersion?: SLODefinitionVersions;
  state: SearchState;
  updateFilter: (newState: SearchState) => void;
  onRefresh: () => void;
}

export function SloManagementSearchBar({ initialVersion, state, onRefresh, updateFilter }: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { suggestions } = useFetchSLOSuggestions();
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [selectedVersion, setSelectedVersion] = useState<Array<EuiComboBoxOptionOption<string>>>(
    initialVersion ? [versionOptions[initialVersion]] : []
  );

  useEffect(() => {
    if (initialVersion) {
      setSelectedVersion([versionOptions[initialVersion]]);
    }
  }, [initialVersion]);

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
        updateFilter({ ...state, search: value?.query ? (value?.query as string) : '' });
      }}
      onRefresh={onRefresh}
      renderQueryInputAppend={() => (
        <>
          <EuiComboBox
            aria-label={filterTagsLabel}
            placeholder={filterTagsLabel}
            delimiter=","
            options={suggestions?.tags ? [existOption, ...suggestions?.tags] : []}
            selectedOptions={selectedOptions}
            onChange={(newOptions) => {
              setSelectedOptions(newOptions);
              updateFilter({
                ...state,
                tags: newOptions.map((option) => String(option.value)),
              });
            }}
            isClearable={true}
            data-test-subj="filter-slos-by-tag"
          />
          <EuiComboBox
            aria-label={filterVersionLabel}
            placeholder={filterVersionLabel}
            style={{ width: '175px' }}
            singleSelection={{ asPlainText: true }}
            options={Object.values(versionOptions)}
            selectedOptions={selectedVersion}
            onChange={(newOption) => {
              setSelectedVersion(newOption);
              updateFilter({
                ...state,
                version: newOption[0]?.value
                  ? (newOption[0].value as SLODefinitionVersions)
                  : undefined,
              });
            }}
            isClearable={true}
            data-test-subj="filter-slos-by-version"
          />
        </>
      )}
    />
  );
}

const filterTagsLabel = i18n.translate('xpack.slo.sloDefinitions.filterByTag', {
  defaultMessage: 'Filter tags',
});

const filterVersionLabel = i18n.translate('xpack.slo.sloDefinitions.filterByVersion', {
  defaultMessage: 'Filter by version',
});

const currentVersion = i18n.translate('xpack.slo.sloDefinitions.version.current', {
  defaultMessage: 'Current',
});

const outdatedVersion = i18n.translate('xpack.slo.sloDefinitions.version.outdated', {
  defaultMessage: 'Outdated',
});

const versionOptions = {
  current: {
    value: 'current',
    label: currentVersion,
  },
  outdated: {
    value: 'outdated',
    label: outdatedVersion,
  },
};

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
