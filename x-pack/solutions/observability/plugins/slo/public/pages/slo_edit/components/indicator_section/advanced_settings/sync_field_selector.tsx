/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useCreateDataView } from '../../../../../hooks/use_create_data_view';
import { createOptionsFromFields } from '../../../helpers/create_options';
import { CreateSLOForm } from '../../../types';
import { OptionalText } from '../../common/optional_text';

const placeholder = i18n.translate('xpack.slo.sloEdit.settings.syncField.placeholder', {
  defaultMessage: 'Select a timestamp field',
});

export function SyncFieldSelector() {
  const { control, watch, getFieldState } = useFormContext<CreateSLOForm>();
  const [index, dataViewId] = watch(['indicator.params.index', 'indicator.params.dataViewId']);
  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: index,
    dataViewId,
  });
  const timestampFields = dataView?.fields?.filter((field) => field.type === 'date') ?? [];

  return (
    <EuiFormRow
      label={
        <span>
          {i18n.translate('xpack.slo.sloEdit.settings.syncField.label', {
            defaultMessage: 'Sync field',
          })}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.slo.sloEdit.settings.syncField.tooltip', {
              defaultMessage:
                'The date field that is used to identify new documents in the source. It is strongly recommended to use a field that contains the ingest timestamp. If you use a different field, you might need to set the delay such that it accounts for data transmission delays. When unspecified, we use the indicator timestamp field.',
            })}
            position="top"
          />
        </span>
      }
      isInvalid={getFieldState('settings.syncField').invalid}
      labelAppend={<OptionalText />}
    >
      <Controller
        name={'settings.syncField'}
        defaultValue={null}
        control={control}
        rules={{ required: false }}
        render={({ field, fieldState }) => {
          return (
            <EuiComboBox<string>
              {...field}
              placeholder={placeholder}
              aria-label={placeholder}
              isClearable
              isDisabled={isIndexFieldsLoading}
              isInvalid={fieldState.invalid}
              isLoading={isIndexFieldsLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected[0].value);
                }

                field.onChange(null);
              }}
              singleSelection={{ asPlainText: true }}
              options={createOptionsFromFields(timestampFields)}
              selectedOptions={
                !!timestampFields && !!field.value
                  ? [{ value: field.value, label: field.value }]
                  : []
              }
            />
          );
        }}
      />
    </EuiFormRow>
  );
}
