/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Option, createOptionsFromFields } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';
import { OptionalText } from './optional_text';

interface Props {
  indexFields: FieldSpec[];
  isDisabled: boolean;
  isLoading: boolean;
}

const placeholder = i18n.translate('xpack.slo.sloEdit.groupBy.placeholder', {
  defaultMessage: 'Select an optional field to group by',
});

export function GroupByFieldSelector({ indexFields, isDisabled, isLoading }: Props) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const [options, setOptions] = useState<Option[]>(createOptionsFromFields(indexFields));

  useEffect(() => {
    setOptions(createOptionsFromFields(indexFields));
  }, [indexFields]);

  const getSelectedItems = (value: string | string[]) => {
    const values = [value].flat();
    const selectedItems: Array<EuiComboBoxOptionOption<string>> = [];
    indexFields.forEach((field) => {
      if (values.includes(field.name)) {
        selectedItems.push({ value: field.name, label: field.name });
      }
    });
    return selectedItems;
  };

  return (
    <EuiFormRow
      label={
        <span>
          {i18n.translate('xpack.slo.sloEdit.groupBy.label', {
            defaultMessage: 'Group by',
          })}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.slo.sloEdit.groupBy.tooltip', {
              defaultMessage: 'Create individual SLOs for each value of the selected field.',
            })}
            position="top"
          />
        </span>
      }
      isInvalid={getFieldState('groupBy').invalid}
      labelAppend={<OptionalText />}
    >
      <Controller
        defaultValue={[ALL_VALUE]}
        name={'groupBy'}
        control={control}
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
                  return field.onChange(selected.map((selection) => selection.value));
                }

                field.onChange([ALL_VALUE]);
              }}
              options={options}
              onSearchChange={(searchValue: string) => {
                setOptions(
                  createOptionsFromFields(indexFields, ({ value }) => value.includes(searchValue))
                );
              }}
              selectedOptions={!!indexFields && !!field.value ? getSelectedItems(field.value) : []}
            />
          );
        }}
      />
    </EuiFormRow>
  );
}
