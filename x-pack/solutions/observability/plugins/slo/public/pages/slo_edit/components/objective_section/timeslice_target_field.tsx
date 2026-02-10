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

export function TimesliceTargetField() {
  const { isFlyout } = useSloFormContext();
  const { control, getFieldState, watch } = useFormContext<CreateSLOForm>();
  const indicator = watch('indicator.type');

  return (
    <EuiFlexItem grow={false}>
      <EuiFormRow
        fullWidth={isFlyout}
        isInvalid={getFieldState('objective.timesliceTarget').invalid}
        label={
          <span>
            {i18n.translate('xpack.slo.sloEdit.timeSliceTarget.label', {
              defaultMessage: 'Timeslice target (%)',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.slo.sloEdit.timeSliceTarget.tooltip', {
                defaultMessage:
                  'The individual time slices target used to determine whether the slice is good or bad.',
              })}
              position="top"
            />
          </span>
        }
      >
        <Controller
          name="objective.timesliceTarget"
          control={control}
          defaultValue={95}
          rules={{
            required: true,
            min: 0,
            max: 100,
          }}
          render={({ field: { ref, onChange, ...field }, fieldState }) => (
            <EuiFieldNumber
              {...field}
              fullWidth={isFlyout}
              required
              disabled={indicator === 'sli.metric.timeslice'}
              isInvalid={fieldState.invalid}
              value={field.value}
              data-test-subj="sloFormObjectiveTimesliceTargetInput"
              min={0}
              max={100}
              step={0.001}
              onChange={(event) => onChange(event.target.value)}
            />
          )}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}
