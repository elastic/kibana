/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFormLabel, EuiDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import React from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { CreateAnnotationForm } from './create_annotation';

const getHelpfulDateFormat = (dateFormat: string) => {
  if (dateFormat.endsWith('HH:mm:ss.SSS')) {
    // we don't want microseconds in the date picker
    return dateFormat.replace(':ss.SSS', ':ss');
  }
  return dateFormat;
};

export function AnnotationRange() {
  const { control, watch } = useFormContext<CreateAnnotationForm>();

  const eventEnd = watch('event.end');
  const dateFormatDefault = useUiSetting<string>('dateFormat');
  const dateFormat = getHelpfulDateFormat(dateFormatDefault);

  if (eventEnd) {
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.observability.annotationForm.euiFormRow.date', {
            defaultMessage: 'Timestamp',
          })}
          display="rowCompressed"
          fullWidth
        >
          <Controller
            name="@timestamp"
            control={control}
            rules={{
              required: true,
            }}
            render={({ field }) => {
              const { value, ref, ...rest } = field;
              return (
                <EuiDatePicker
                  showTimeSelect
                  selected={field.value}
                  fullWidth
                  compressed
                  prepend={
                    <EuiFormLabel>
                      {i18n.translate('xpack.observability.annotationRange.fromFormLabelLabel', {
                        defaultMessage: 'From',
                      })}
                    </EuiFormLabel>
                  }
                  dateFormat={dateFormat}
                  {...rest}
                />
              );
            }}
          />
        </EuiFormRow>
        <EuiFormRow display="rowCompressed" fullWidth>
          <Controller
            name="event.end"
            control={control}
            rules={{
              required: true,
            }}
            render={({ field }) => {
              const { value, ref, ...rest } = field;
              return (
                <EuiDatePicker
                  showTimeSelect
                  selected={field.value}
                  fullWidth
                  compressed
                  prepend={
                    <EuiFormLabel>
                      {i18n.translate('xpack.observability.annotationRange.toFormLabelLabel', {
                        defaultMessage: 'To',
                      })}
                    </EuiFormLabel>
                  }
                  dateFormat={dateFormat}
                  {...rest}
                />
              );
            }}
          />
        </EuiFormRow>
      </>
    );
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.annotationForm.euiFormRow.annotationDate', {
        defaultMessage: 'Annotation date',
      })}
    >
      <Controller
        name="@timestamp"
        control={control}
        rules={{
          required: true,
        }}
        render={({ field }) => {
          const { value, ref, ...rest } = field;
          return (
            <EuiDatePicker
              showTimeSelect
              selected={field.value}
              compressed
              dateFormat={dateFormat}
              {...rest}
            />
          );
        }}
      />
    </EuiFormRow>
  );
}
