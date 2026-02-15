/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiTextArea, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import { useSloFormContext } from '../slo_form_context';
import { OptionalText } from '../common/optional_text';

export function DescriptionField() {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();
  const descriptionId = useGeneratedHtmlId({ prefix: 'sloDescription' });

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      label={i18n.translate('xpack.slo.sloEdit.description.sloDescription', {
        defaultMessage: 'Description',
      })}
      labelAppend={<OptionalText />}
    >
      <Controller
        name="description"
        defaultValue=""
        control={control}
        rules={{ required: false }}
        render={({ field: { ref, ...field } }) => (
          <EuiTextArea
            {...field}
            fullWidth={isFlyout}
            id={descriptionId}
            data-test-subj="sloFormDescriptionTextArea"
            placeholder={i18n.translate('xpack.slo.sloEdit.description.sloDescriptionPlaceholder', {
              defaultMessage: 'A short description of the SLO',
            })}
          />
        )}
      />
    </EuiFormRow>
  );
}
