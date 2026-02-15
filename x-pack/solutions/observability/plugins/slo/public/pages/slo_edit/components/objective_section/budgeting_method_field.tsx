/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { BUDGETING_METHOD_OPTIONS } from '../../constants';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';
import { OBJECTIVE_LABELS } from './objective_section_labels';

interface BudgetingMethodFieldProps {
  selectId: string;
  indicator: string;
}

export function BudgetingMethodField({ selectId, indicator }: BudgetingMethodFieldProps) {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      label={
        <span>
          {OBJECTIVE_LABELS.budgetingMethod}{' '}
          <EuiIconTip content={OBJECTIVE_LABELS.budgetingMethodTooltip} position="top" />
        </span>
      }
    >
      <Controller
        name="budgetingMethod"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, ...field } }) => (
          <EuiSelect
            {...field}
            fullWidth={isFlyout}
            disabled={
              indicator === 'sli.metric.timeslice' || indicator === 'sli.synthetics.availability'
            }
            required
            id={selectId}
            data-test-subj="sloFormBudgetingMethodSelect"
            options={BUDGETING_METHOD_OPTIONS}
          />
        )}
      />
    </EuiFormRow>
  );
}
