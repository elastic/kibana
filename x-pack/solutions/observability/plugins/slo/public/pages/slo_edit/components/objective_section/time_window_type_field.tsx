/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { TIMEWINDOW_TYPE_OPTIONS } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';
import { OBJECTIVE_LABELS } from './objective_section_labels';

interface TimeWindowFieldProps {
  selectId: string;
}

export function TimeWindowTypeField({ selectId }: TimeWindowFieldProps) {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      label={
        <span>
          {OBJECTIVE_LABELS.timeWindow}{' '}
          <EuiIconTip content={OBJECTIVE_LABELS.timeWindowTooltip} position="top" />
        </span>
      }
    >
      <Controller
        name="timeWindow.type"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, ...field } }) => (
          <EuiSelect
            {...field}
            fullWidth={isFlyout}
            required
            id={selectId}
            data-test-subj="sloFormTimeWindowTypeSelect"
            options={TIMEWINDOW_TYPE_OPTIONS}
            value={field.value}
          />
        )}
      />
    </EuiFormRow>
  );
}
