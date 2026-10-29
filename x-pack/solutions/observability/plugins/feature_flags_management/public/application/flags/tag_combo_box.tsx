/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { LIMITS } from '../../../common';
import { useAppServices } from '../app_services';
import { useAsyncData, useDebouncedValue } from '../use_async_data';

/** Suggests tags already used by flags, and still accepts a new tag. */
export const TagComboBox = ({
  selected,
  onChange,
  singleSelection = false,
  readOnly = false,
  compressed = false,
  placeholder,
  ariaLabel,
  dataTestSubj,
}: {
  selected: readonly string[];
  onChange: (tags: string[]) => void;
  singleSelection?: boolean;
  readOnly?: boolean;
  compressed?: boolean;
  placeholder?: string;
  ariaLabel: string;
  dataTestSubj?: string;
}) => {
  const { api } = useAppServices();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 250);
  const load = useCallback(
    () =>
      api
        .listFlagTags({
          prefix: debouncedSearch || undefined,
          size: LIMITS.maxSuggestions,
        })
        .then((response) => response.items),
    [api, debouncedSearch]
  );
  const { data, loading } = useAsyncData(load);
  const selectedTags = new Set(selected);
  const options = (data ?? [])
    .filter((tag) => !selectedTags.has(tag))
    .map((tag) => ({ label: tag }));

  const addTag = (created: string) => {
    const tag = created.trim();
    if (!tag || selectedTags.has(tag)) {
      return;
    }
    if (!singleSelection && selected.length >= LIMITS.maxTags) {
      return;
    }
    onChange(singleSelection ? [tag] : [...selected, tag]);
  };

  return (
    <EuiComboBox
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      placeholder={placeholder}
      fullWidth
      compressed={compressed}
      async
      isLoading={loading}
      isDisabled={readOnly}
      isClearable={singleSelection}
      singleSelection={singleSelection ? { asPlainText: true } : false}
      options={options}
      selectedOptions={selected.map((tag) => ({ label: tag }))}
      onSearchChange={setSearchValue}
      onChange={(next) => onChange(next.map((option) => option.label))}
      onCreateOption={addTag}
    />
  );
};
