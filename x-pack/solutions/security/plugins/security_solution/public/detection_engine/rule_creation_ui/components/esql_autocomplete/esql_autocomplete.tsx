/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { useEsqlFieldOptions } from './use_esql_fields_options';
const AS_PLAIN_TEXT = { asPlainText: true };
const COMPONENT_WIDTH = 500;

interface AutocompleteFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  idAria: string;
  isDisabled: boolean;
  fieldType: 'string';
  placeholder?: string;
  esqlQuery: string | undefined;
}

/**
 * autocomplete form component that works with ES|QL query
 * it receives query as one of the parameters, fetches available fields and convert them to
 * options, that populate autocomplete component
 */
export const EsqlAutocomplete: React.FC<AutocompleteFieldProps> = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled,
  fieldType,
  placeholder,
  esqlQuery,
}): JSX.Element => {
  const handleValuesChange = useCallback(
    ([newOption]: EuiComboBoxOptionOption[]): void => {
      field.setValue(newOption?.label ?? '');
    },
    [field]
  );
  const { options, isLoading } = useEsqlFieldOptions(esqlQuery, fieldType);

  const value = field?.value;
  const selectedOptions = typeof value === 'string' && value ? [{ label: value }] : [];

  const isInvalid =
    typeof value === 'string' && value ? !options.some((option) => option.label === value) : false;

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      fullWidth
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <EuiComboBox
        placeholder={placeholder ?? ''}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleValuesChange}
        isLoading={isLoading}
        isDisabled={isDisabled || isLoading}
        isClearable={false}
        singleSelection={AS_PLAIN_TEXT}
        data-test-subj="esqlAutocompleteComboBox"
        style={{ width: `${COMPONENT_WIDTH}px` }}
        fullWidth
        isInvalid={isInvalid}
      />
    </EuiFormRow>
  );
};

EsqlAutocomplete.displayName = 'EsqlAutocomplete';
