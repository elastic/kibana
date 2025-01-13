/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { InvestigationForm } from '../investigation_edit_form';

const I18N_LABEL = i18n.translate(
  'xpack.investigateApp.investigationEditForm.externalIncidentUrlLabel',
  { defaultMessage: 'External incident URL' }
);

export function ExternalIncidentField() {
  const { control, getFieldState } = useFormContext<InvestigationForm>();

  return (
    <EuiFormRow
      fullWidth
      isInvalid={getFieldState('externalIncidentUrl').invalid}
      label={I18N_LABEL}
    >
      <Controller
        name="externalIncidentUrl"
        control={control}
        rules={{ required: false }}
        render={({ field: { ref, ...field }, fieldState }) => (
          <EuiFieldText
            {...field}
            value={field.value || ''}
            data-test-subj="investigateAppExternalIncidentFieldFieldText"
            fullWidth
            isInvalid={fieldState.invalid}
            placeholder={I18N_LABEL}
          />
        )}
      />
    </EuiFormRow>
  );
}
