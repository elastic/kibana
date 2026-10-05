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
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
}) => (
  <EuiFieldText
    data-test-subj="nightshiftTimeFieldFieldText"
    type="time"
    compressed
    aria-label={label}
    value={value}
    step={step}
    onChange={(event) => event.target.value && onChange(event.target.value)}
  />
);
