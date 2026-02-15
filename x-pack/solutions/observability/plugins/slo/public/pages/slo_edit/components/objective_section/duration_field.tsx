/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import type { TimeWindowType } from '@kbn/slo-schema';
import { Controller, useFormContext } from 'react-hook-form';
import { CALENDARALIGNED_TIMEWINDOW_OPTIONS, ROLLING_TIMEWINDOW_OPTIONS } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';
import { OBJECTIVE_LABELS } from './objective_section_labels';

interface DurationFieldProps {
  selectId: string;
  timeWindowType: TimeWindowType;
}

export function DurationField({ selectId, timeWindowType }: DurationFieldProps) {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      label={
        <span>
          {OBJECTIVE_LABELS.duration}{' '}
          <EuiIconTip content={OBJECTIVE_LABELS.durationTooltip} position="top" />
        </span>
      }
    >
      <Controller
        name="timeWindow.duration"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, ...field } }) => (
          <EuiSelect
            {...field}
            fullWidth={isFlyout}
            required
            id={selectId}
            data-test-subj="sloFormTimeWindowDurationSelect"
            options={
              timeWindowType === 'calendarAligned'
                ? CALENDARALIGNED_TIMEWINDOW_OPTIONS
                : ROLLING_TIMEWINDOW_OPTIONS
            }
            value={field.value}
          />
        )}
      />
    </EuiFormRow>
  );
}
