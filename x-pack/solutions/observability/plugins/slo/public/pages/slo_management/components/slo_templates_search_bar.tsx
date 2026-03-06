/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useFetchSloTemplateTags } from '../../../hooks/use_fetch_slo_template_tags';

interface Props {
  search: string;
  tags: string[];
  onSearchChange: (search: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function SloTemplatesSearchBar({ search, tags, onSearchChange, onTagsChange }: Props) {
  const { data: tagsData } = useFetchSloTemplateTags();

  const tagOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => (tagsData?.tags ?? []).map((tag) => ({ label: tag, value: tag })),
    [tagsData]
  );

  const selectedTagOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => tags.map((tag) => ({ label: tag, value: tag })),
    [tags]
  );

  return (
    <EuiFlexGroup gutterSize="s" responsive>
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          placeholder={SEARCH_PLACEHOLDER}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          data-test-subj="sloTemplatesSearchInput"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
        <EuiComboBox
          compressed
          aria-label={FILTER_TAGS_LABEL}
          placeholder={FILTER_TAGS_LABEL}
          options={tagOptions}
          selectedOptions={selectedTagOptions}
          onChange={(newOptions) => {
            onTagsChange(newOptions.map((option) => String(option.value)));
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
