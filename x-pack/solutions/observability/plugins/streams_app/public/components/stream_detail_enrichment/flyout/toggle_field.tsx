/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiSwitch, htmlIdGenerator } from '@elastic/eui';

interface ToggleFieldProps {
  helpText?: string;
  id?: string;
  label: string;
  name: string;
}

export const ToggleField = ({
  helpText,
  id = createId(),
  label,
  name,
  ...rest
}: ToggleFieldProps) => {
  const { field } = useController({ name });

  return (
    <EuiFormRow helpText={helpText} fullWidth describedByIds={id ? [id] : undefined} {...rest}>
      <EuiSwitch
        id={id}
        label={label}
        checked={field.value}
        onChange={(e) => field.onChange(e.target.checked)}
      />
    </EuiFormRow>
  );
};

const createId = htmlIdGenerator();
