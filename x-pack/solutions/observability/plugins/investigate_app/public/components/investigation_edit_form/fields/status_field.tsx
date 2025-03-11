/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationResponse } from '@kbn/investigation-shared';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { InvestigationForm } from '../investigation_edit_form';

const I18N_STATUS_LABEL = i18n.translate(
  'xpack.investigateApp.investigationEditForm.span.statusLabel',
  { defaultMessage: 'Status' }
);

export const statusToColor: Record<InvestigationResponse['status'], string> = {
  triage: 'warning',
  active: 'danger',
  mitigated: 'success',
  resolved: 'success',
  cancelled: 'default',
};

const options = [
  {
    label: 'Triage',
    value: 'triage',
    color: statusToColor.triage,
  },
  {
    label: 'Active',
    value: 'active',
    color: statusToColor.active,
  },
  {
    label: 'Mitigated',
    value: 'mitigated',
    color: statusToColor.mitigated,
  },
  {
    label: 'Resolved',
    value: 'resolved',
    color: statusToColor.resolved,
  },
  {
    label: 'Cancelled',
    value: 'cancelled',
    color: statusToColor.cancelled,
  },
];

export function StatusField() {
  const { control, getFieldState } = useFormContext<InvestigationForm>();

  return (
    <EuiFormRow label={I18N_STATUS_LABEL} fullWidth isInvalid={getFieldState('status').invalid}>
      <Controller
        control={control}
        name="status"
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <EuiComboBox
            {...field}
            fullWidth
            isInvalid={fieldState.invalid}
            isClearable={false}
            aria-label={I18N_STATUS_LABEL}
            placeholder={I18N_STATUS_LABEL}
            options={options}
            selectedOptions={options.filter((option) => option.value === field.value)}
            onChange={(selected) => {
              return field.onChange(selected[0].value);
            }}
            singleSelection
          />
        )}
      />
    </EuiFormRow>
  );
}
