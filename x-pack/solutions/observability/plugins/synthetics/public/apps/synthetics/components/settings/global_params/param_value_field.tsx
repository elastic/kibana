/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFormRow, EuiSpacer, EuiTextArea } from '@elastic/eui';
import React from 'react';
import { useFormContext, useFormState } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { OptionalText } from '../components/optional_text';
import { ListParamItem } from './params_list';
import { SyntheticsParams } from '../../../../../../common/runtime_types';
import { VALUE_LABEL, VALUE_REQUIRED } from './add_param_form';

export const ParamValueField = ({ isEditingItem }: { isEditingItem: ListParamItem | null }) => {
  const { register } = useFormContext<SyntheticsParams>();
  const { errors } = useFormState<SyntheticsParams>();

  if (isEditingItem) {
    return (
      <>
        <EuiFormRow
          fullWidth
          label={NEW_VALUE_LABEL}
          isInvalid={Boolean(errors?.value)}
          error={errors?.value?.message}
          labelAppend={<OptionalText />}
        >
          <EuiTextArea
            data-test-subj="syntheticsAddParamFormTextArea"
            fullWidth
            aria-label={NEW_VALUE_LABEL}
            {...register('value')}
          />
        </EuiFormRow>
        <EuiSpacer size="xs" />
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.synthetics.paramValueField.euiCallOut.newValue', {
            defaultMessage:
              'Assign a new value to update this parameter, or leave blank to keep the current value.',
          })}
          iconType="iInCircle"
        />
      </>
    );
  }

  return (
    <EuiFormRow
      fullWidth
      label={VALUE_LABEL}
      isInvalid={Boolean(errors?.value)}
      error={errors?.value?.message}
    >
      <EuiTextArea
        data-test-subj="syntheticsAddParamFormTextArea"
        fullWidth
        aria-label={VALUE_LABEL}
        {...register('value', {
          required: {
            value: true,
            message: VALUE_REQUIRED,
          },
        })}
      />
    </EuiFormRow>
  );
};

export const NEW_VALUE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.paramForm.newValue',
  {
    defaultMessage: 'New value',
  }
);
