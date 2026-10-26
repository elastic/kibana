/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LIMITS, type VariationValue } from '../../../../common';
import { useAppServices } from '../../app_services';
import { useAsyncData, useDebouncedValue } from '../../use_async_data';

export const ValuesComboBox = ({
  app,
  environment,
  attribute,
  values,
  singleSelection,
  readOnly,
  onChange,
}: {
  app?: string;
  environment: string;
  attribute: string;
  values: readonly VariationValue[];
  singleSelection: boolean;
  readOnly: boolean;
  onChange: (values: VariationValue[]) => void;
}) => {
  const { api } = useAppServices();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 250);
  const load = useCallback(() => {
    if (!app || !environment || !attribute) {
      return Promise.resolve([]);
    }
    return api
      .listObservedValues({
        app,
        environment,
        attribute,
        prefix: debouncedSearch || undefined,
        size: LIMITS.defaultSuggestions,
      })
      .then((response) => response.items.map((item) => item.value));
  }, [api, app, environment, attribute, debouncedSearch]);
  const { data, loading } = useAsyncData(load);
  const options = (data ?? []).map((value) => ({ label: value, value }));
  const selectedOptions: Array<EuiComboBoxOptionOption<VariationValue>> = values.map((value) => ({
    label: String(value),
    value,
  }));

  const commit = (next: VariationValue[]) => {
    const unique: VariationValue[] = [];
    for (const value of next) {
      if (
        !unique.some((existing) => Object.is(existing, value) || String(existing) === String(value))
      ) {
        unique.push(value);
      }
    }
    onChange(singleSelection ? unique.slice(0, 1) : unique);
  };

  return (
    <EuiComboBox
      aria-label={i18n.translate('xpack.featureFlagsManagement.ruleComposer.valuesAriaLabel', {
        defaultMessage: 'Values',
      })}
      placeholder={i18n.translate('xpack.featureFlagsManagement.ruleComposer.valuesPlaceholder', {
        defaultMessage: 'Select or type a value',
      })}
      fullWidth
      async={Boolean(app && environment && attribute)}
      isLoading={loading && Boolean(app && attribute)}
      isDisabled={readOnly}
      singleSelection={singleSelection ? { asPlainText: true } : false}
      options={options}
      selectedOptions={selectedOptions}
      onSearchChange={setSearchValue}
      onChange={(next) => commit(next.map((option) => option.value ?? option.label))}
      onCreateOption={(created) => {
        const value = created.trim();
        if (!value) {
          return;
        }
        commit(singleSelection ? [value] : [...values, value]);
      }}
    />
  );
};
