/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import type { Option } from '../../helpers/create_options';
import { createOptionsFromFields } from '../../helpers/create_options';
import type { CreateSLOForm } from '../../types';

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
  // Subscribes this component to the errors it renders (the form root does not re-render on validation).
  const formState = useFormState({ control, name: 'indicator.params.timestampField' });
  const [options, setOptions] = useState<Option[]>(createOptionsFromFields(fields));

  useEffect(() => {
    setOptions(createOptionsFromFields(fields));
  }, [fields]);

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.slo.sloEdit.timestampField.label', {
        defaultMessage: 'Timestamp field',
      })}
      isInvalid={getFieldState('indicator.params.timestampField', formState).invalid}
    >
      <Controller
        name={'indicator.params.timestampField'}
        control={control}
        rules={{ required: !isDisabled }}
        render={({ field, fieldState }) => {
          return (
            <EuiComboBox<string>
              {...field}
              fullWidth
              compressed
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
