/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { EuiSelectOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';

const indicatorLabel = i18n.translate('xpack.slo.sloEdit.definition.sliType', {
  defaultMessage: 'Choose the SLI type',
});

interface IndicatorTypeSelectProps {
  options: EuiSelectOption[];
}

export function IndicatorTypeSelect({ options }: IndicatorTypeSelectProps) {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();

  return (
    <EuiFormRow label={indicatorLabel} fullWidth={isFlyout}>
      <Controller
        name="indicator.type"
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, ...field } }) => (
          <EuiSelect
            {...field}
            required
            fullWidth={isFlyout}
            data-test-subj="sloFormIndicatorTypeSelect"
            options={options}
            aria-label={indicatorLabel}
          />
        )}
      />
    </EuiFormRow>
  );
}
