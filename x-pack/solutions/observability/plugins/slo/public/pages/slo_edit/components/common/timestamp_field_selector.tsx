/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Option, createOptionsFromFields } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';

interface Props {
  fields: FieldSpec[];
  isDisabled: boolean;
  isLoading: boolean;
}

const placeholder = i18n.translate('xpack.slo.sloEdit.timestampField.placeholder', {
  defaultMessage: 'Select a timestamp field',
});

export function TimestampFieldSelector({ fields, isDisabled, isLoading }: Props) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const [options, setOptions] = useState<Option[]>(createOptionsFromFields(fields));

  useEffect(() => {
    setOptions(createOptionsFromFields(fields));
  }, [fields]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.slo.sloEdit.timestampField.label', {
        defaultMessage: 'Timestamp field',
      })}
      isInvalid={getFieldState('indicator.params.timestampField').invalid}
    >
      <Controller
        name={'indicator.params.timestampField'}
        control={control}
        rules={{ required: !isDisabled }}
        render={({ field, fieldState }) => {
          return (
            <EuiComboBox<string>
              {...field}
              async
              placeholder={placeholder}
              aria-label={placeholder}
              isClearable
              isDisabled={isLoading || isDisabled}
              isInvalid={fieldState.invalid}
              isLoading={isLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected[0].value);
                }

                field.onChange('');
              }}
              singleSelection={{ asPlainText: true }}
              options={options}
              onSearchChange={(searchValue: string) => {
                setOptions(
                  createOptionsFromFields(fields, ({ value }) => value.includes(searchValue))
                );
              }}
              selectedOptions={
                !!fields && !!field.value ? [{ value: field.value, label: field.value }] : []
              }
            />
          );
        }}
      />
    </EuiFormRow>
  );
}
