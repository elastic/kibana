/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useFetchSloTemplateTags } from '../../../../hooks/use_fetch_slo_template_tags';
import type { TemplatesSearchState } from '../../hooks/use_templates_url_search_state';

interface Props {
  state: TemplatesSearchState;
  onStateChange: (newState: Partial<TemplatesSearchState>) => void;
}

export function SloTemplatesSearchBar({ state, onStateChange }: Props) {
  const { data: allTemplateTags } = useFetchSloTemplateTags();
  const { search, tags } = state;
  const [inputValue, setInputValue] = useState(search);

  useDebounce(() => onStateChange({ search: inputValue }), 300, [inputValue]);

  const tagOptions: Array<EuiComboBoxOptionOption<string>> = (allTemplateTags?.tags ?? []).map(
    (tag) => ({
      label: tag,
      value: tag,
    })
  );

  return (
    <EuiFlexGroup gutterSize="s" responsive>
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          compressed
          placeholder={SEARCH_PLACEHOLDER}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          data-test-subj="sloTemplatesSearchInput"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 200, maxWidth: 300 }}>
        <EuiComboBox
          compressed
          aria-label={FILTER_TAGS_LABEL}
          placeholder={FILTER_TAGS_LABEL}
          options={tagOptions}
          selectedOptions={tags.map((tag) => ({
            label: tag,
            value: tag,
          }))}
          onChange={(newOptions) => {
            onStateChange({ tags: newOptions.map((option) => String(option.value)) });
          }}
          isClearable
          data-test-subj="sloTemplatesFilterByTag"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const SEARCH_PLACEHOLDER = i18n.translate('xpack.slo.sloTemplatesSearchBar.searchPlaceholder', {
  defaultMessage: 'Search templates by name',
});

const FILTER_TAGS_LABEL = i18n.translate('xpack.slo.sloTemplatesSearchBar.filterByTag', {
  defaultMessage: 'Filter tags',
});
