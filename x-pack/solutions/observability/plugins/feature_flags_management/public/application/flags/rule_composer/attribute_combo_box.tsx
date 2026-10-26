/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiComboBox } from '@elastic/eui';
import { LIMITS } from '../../../../common';
import { useAppServices } from '../../app_services';
import { useAsyncData, useDebouncedValue } from '../../use_async_data';

export const AttributeComboBox = ({
  app,
  environment,
  selected,
  readOnly,
  ariaLabel,
  placeholder,
  onChange,
}: {
  app?: string;
  environment: string;
  selected: string;
  readOnly: boolean;
  ariaLabel: string;
  placeholder: string;
  onChange: (attribute: string) => void;
}) => {
  const { api } = useAppServices();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 250);
  const load = useCallback(() => {
    if (!app || !environment) {
      return Promise.resolve([]);
    }
    return api
      .listObservedAttributes({
        app,
        environment,
        prefix: debouncedSearch || undefined,
        size: LIMITS.defaultSuggestions,
      })
      .then((response) => response.items.map((item) => item.name));
  }, [api, app, environment, debouncedSearch]);
  const { data, loading } = useAsyncData(load);
  const options = (data ?? []).map((name) => ({ label: name }));

  return (
    <EuiComboBox
      aria-label={ariaLabel}
      placeholder={placeholder}
      fullWidth
      async={Boolean(app && environment)}
      isLoading={loading && Boolean(app)}
      isDisabled={readOnly}
      isClearable
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selected ? [{ label: selected }] : []}
      onSearchChange={setSearchValue}
      onChange={(next) => onChange(next[0]?.label ?? '')}
      onCreateOption={(created) => {
        const attribute = created.trim();
        if (attribute) {
          onChange(attribute);
        }
      }}
    />
  );
};
