/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';

export function TimesliceWindowField() {
  const { isFlyout } = useSloFormContext();
  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  return (
    <EuiFlexItem grow={false}>
      <EuiFormRow
        fullWidth={isFlyout}
        isInvalid={getFieldState('objective.timesliceWindow').invalid}
        label={
          <span>
            {i18n.translate('xpack.slo.sloEdit.timesliceWindow.label', {
              defaultMessage: 'Timeslice window (in minutes)',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.timesliceWindow.tooltip', {
                defaultMessage: 'The time slice window size used to evaluate the data from.',
              })}
              position="top"
            />
          </span>
        }
      >
        <Controller
          name="objective.timesliceWindow"
          defaultValue="1"
          control={control}
          rules={{ required: true, min: 1, max: 120 }}
          render={({ field: { ref, onChange, ...field }, fieldState }) => (
            <EuiFieldNumber
              {...field}
              fullWidth={isFlyout}
              isInvalid={fieldState.invalid}
              required
              data-test-subj="sloFormObjectiveTimesliceWindowInput"
              value={field.value}
              min={1}
              max={120}
              step={1}
              onChange={(event) => {
                const val = event.target.value;
                onChange(val === '' ? '' : String(parseInt(val, 10)));
              }}
            />
          )}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}
