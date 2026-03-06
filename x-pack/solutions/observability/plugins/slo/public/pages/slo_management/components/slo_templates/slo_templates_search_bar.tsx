/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { observabilityAppId } from '@kbn/observability-shared-plugin/common';
import React, { useState } from 'react';
import { useFetchSloTemplateTags } from '../../../../hooks/use_fetch_slo_template_tags';
import { useKibana } from '../../../../hooks/use_kibana';
import type { TemplatesSearchState } from '../../hooks/use_templates_url_search_state';

interface Props {
  state: TemplatesSearchState;
  onStateChange: (newState: Partial<TemplatesSearchState>) => void;
}

export function SloTemplatesSearchBar({ state, onStateChange }: Props) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;
  const { data: allTemplateTags } = useFetchSloTemplateTags();
  const { tags } = state;

  const [selectedTagOptions, setSelectedTagOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(tags.map((tag) => ({ label: tag, value: tag })));

  const tagOptions: Array<EuiComboBoxOptionOption<string>> = (allTemplateTags?.tags ?? []).map(
    (tag) => ({ label: tag, value: tag })
  );

  return (
    <SearchBar
      appName={observabilityAppId}
      placeholder={SEARCH_PLACEHOLDER}
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
      }}
      renderQueryInputAppend={() => (
        <EuiComboBox
          compressed
          css={{ maxWidth: 300 }}
          aria-label={FILTER_TAGS_LABEL}
          placeholder={FILTER_TAGS_LABEL}
          options={tagOptions}
          selectedOptions={selectedTagOptions}
          onChange={(newOptions) => {
            setSelectedTagOptions(newOptions);
            onStateChange({ tags: newOptions.map((option) => String(option.value)) });
          }}
          isClearable
          data-test-subj="sloTemplatesFilterByTag"
        />
      )}
    />
  );
}

const SEARCH_PLACEHOLDER = i18n.translate('xpack.slo.sloTemplatesSearchBar.searchPlaceholder', {
  defaultMessage: 'Search templates by name',
});

const FILTER_TAGS_LABEL = i18n.translate('xpack.slo.sloTemplatesSearchBar.filterByTag', {
  defaultMessage: 'Filter tags',
});
