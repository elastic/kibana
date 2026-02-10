/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';

export function SloNameField() {
  const { isFlyout } = useSloFormContext();
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const sloNameId = useGeneratedHtmlId({ prefix: 'sloName' });

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      isInvalid={getFieldState('name').invalid}
      label={i18n.translate('xpack.slo.sloEdit.description.sloName', {
        defaultMessage: 'SLO Name',
      })}
    >
      <Controller
        name="name"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, ...field }, fieldState }) => (
          <EuiFieldText
            {...field}
            fullWidth={isFlyout}
            isInvalid={fieldState.invalid}
            id={sloNameId}
            data-test-subj="sloFormNameInput"
            placeholder={i18n.translate('xpack.slo.sloEdit.description.sloNamePlaceholder', {
              defaultMessage: 'Name for the SLO',
            })}
          />
        )}
      />
    </EuiFormRow>
  );
}
