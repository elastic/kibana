/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { debounce } from 'lodash';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import {
  Suggestion,
  useFetchSyntheticsSuggestions,
} from '../hooks/use_fetch_synthetics_suggestions';
import { OptionalText } from './optional_text';
import { MonitorFilters } from '../monitors_overview/types';

interface Option {
  label: string;
  value: string;
}

export interface Props {
  dataTestSubj: string;
  label: string;
  name: FieldPath<MonitorFilters>;
  placeholder: string;
  tooltip?: ReactNode;
  suggestions?: Suggestion[];
  isLoading?: boolean;
  required?: boolean;
}

export function FieldSelector({
  dataTestSubj,
  label,
  name,
  placeholder,
  tooltip,
  required,
}: Props) {
  const { control, getFieldState } = useFormContext<MonitorFilters>();
  const [search, setSearch] = useState<string>('');

  const { suggestions = [], isLoading } = useFetchSyntheticsSuggestions({
    search,
    fieldName: name,
  });

  const debouncedSearch = debounce((value) => setSearch(value), 200);

  return (
    <EuiFlexItem>
      <EuiFormRow
        label={
          !!tooltip ? (
            <span>
              {label} {tooltip}
            </span>
          ) : (
            label
          )
        }
        isInvalid={getFieldState(name).invalid}
        fullWidth
        labelAppend={!required ? <OptionalText /> : undefined}
      >
        <Controller
          defaultValue=""
          name={name}
          control={control}
          rules={{ required }}
          render={({ field, fieldState }) => {
            const selectedOptions =
              !!Array.isArray(field.value) && field.value.length
                ? createSelectedOptions(field.value, suggestions)
                : [];

            return (
              <EuiComboBox
                {...field}
                aria-label={placeholder}
                async
                data-test-subj={dataTestSubj}
                isClearable
                fullWidth
                isInvalid={fieldState.invalid}
                isLoading={isLoading}
                onChange={(selected: EuiComboBoxOptionOption[]) => {
                  if (selected.length) {
                    field.onChange(
                      selected.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))
                    );
                    return;
                  }
                  field.onChange([]);
                }}
                onSearchChange={(value: string) => debouncedSearch(value)}
                options={createOptions(suggestions)}
                placeholder={placeholder}
                selectedOptions={selectedOptions}
              />
            );
          }}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function createOptions(suggestions: Suggestion[] = []): Option[] {
  return suggestions
    .map((suggestion) => ({ label: suggestion.label, value: suggestion.value }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}

function createSelectedOptions(selected: Option[] = [], suggestions: Suggestion[] = []): Option[] {
  return selected.map((value) => {
    const suggestion = suggestions.find((s) => s.value === value.value);
    if (!suggestion) {
      return { label: value.value, value: value.value };
    }
    return { label: suggestion.label, value: suggestion.value };
  });
}
