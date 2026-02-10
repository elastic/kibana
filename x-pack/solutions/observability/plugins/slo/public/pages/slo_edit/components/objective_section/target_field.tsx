/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';
import { OBJECTIVE_LABELS } from './objective_section_labels';

export function TargetField() {
  const { isFlyout } = useSloFormContext();
  const { control, getFieldState } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      isInvalid={getFieldState('objective.target').invalid}
      label={
        <span>
          {OBJECTIVE_LABELS.targetSlo}{' '}
          <EuiIconTip content={OBJECTIVE_LABELS.targetSloTooltip} position="top" />
        </span>
      }
    >
      <Controller
        name="objective.target"
        control={control}
        rules={{ required: true, min: 0.001, max: 99.999 }}
        render={({ field: { ref, onChange, ...field }, fieldState }) => (
          <EuiFieldNumber
            {...field}
            fullWidth={isFlyout}
            required
            isInvalid={fieldState.invalid}
            data-test-subj="sloFormObjectiveTargetInput"
            value={field.value}
            min={0.001}
            max={99.999}
            step={0.001}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />
    </EuiFormRow>
  );
}
