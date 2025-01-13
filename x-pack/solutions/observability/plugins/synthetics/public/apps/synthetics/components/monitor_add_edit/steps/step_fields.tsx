/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { useFormContext, FieldError } from 'react-hook-form';
import { Step } from './step';
import { FORM_CONFIG } from '../form/form_config';
import { Field } from '../form/field';
import { ConfigKey, FormMonitorType, StepKey } from '../types';

export const StepFields = ({
  description,
  stepKey,
  readOnly = false,
  descriptionOnly = false,
}: {
  description: React.ReactNode;
  stepKey: StepKey;
  readOnly?: boolean;
  descriptionOnly?: boolean;
}) => {
  const {
    watch,
    formState: { errors },
  } = useFormContext();
  const [type]: [FormMonitorType] = watch([ConfigKey.FORM_MONITOR_TYPE]);

  const formConfig = useMemo(() => {
    return FORM_CONFIG(readOnly)[type];
  }, [readOnly, type]);

  return descriptionOnly ? (
    <EuiText size="m">{description}</EuiText>
  ) : (
    <Step description={description}>
      {formConfig[stepKey]?.map((field) => {
        return (
          <Field
            {...field}
            key={field.fieldKey}
            fieldError={errors[field.fieldKey] as FieldError}
          />
        );
      })}
    </Step>
  );
};
