/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText, EuiIcon } from '@elastic/eui';

interface CloudConnectorNameFieldProps {
  value: string;
  onChange: (name: string, isValid: boolean, validationError?: string) => void;
  disabled?: boolean;
}

export const CloudConnectorNameField: React.FC<CloudConnectorNameFieldProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  // Format validation only
  const validateFormat = (name: string): string | undefined => {
    if (!name) return 'Cloud Connector Name is required';
    if (name.length < 3) return 'Name must be at least 3 characters';
    if (name.length > 64) return 'Name must be 64 characters or less';
    if (!/^[a-zA-Z0-9-_ ]+$/.test(name)) {
      return 'Only letters, numbers, dashes, spaces, and underscores are allowed';
    }
    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const formatError = validateFormat(newValue);

    onChange(newValue, !formatError, formatError);
  };

  const error = validateFormat(value);
  const isValid = !error && value.length >= 3;

  return (
    <EuiFormRow
      label="Cloud Connector Name"
      isInvalid={!!error}
      error={error}
      helpText={!error ? 'Choose a unique, descriptive name (3-64 characters)' : undefined}
      fullWidth
    >
      <EuiFieldText
        value={value}
        onChange={handleChange}
        isInvalid={!!error}
        disabled={disabled}
        placeholder="e.g., cloud-connector-prod-aws"
        append={isValid ? <EuiIcon type="check" color="success" /> : undefined}
        fullWidth
      />
    </EuiFormRow>
  );
};
