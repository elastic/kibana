/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText } from '@elastic/eui';

export const TimeField = ({
  label,
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) => (
  <EuiFieldText
    data-test-subj="nightshiftTimeFieldFieldText"
    type="time"
    compressed
    aria-label={label}
    value={value}
    disabled={disabled}
    readOnly={readOnly}
    onChange={(event) => event.target.value && onChange(event.target.value)}
  />
);
