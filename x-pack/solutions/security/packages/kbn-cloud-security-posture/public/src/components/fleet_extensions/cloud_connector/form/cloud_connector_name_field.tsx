/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
    if (!name || !name.trim())
      return i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudConnectorNameField.requiredError',
        {
          defaultMessage: 'Cloud Connector Name is required',
        }
      );
    if (name.length > 255)
      return i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudConnectorNameField.tooLongError',
        {
          defaultMessage: 'Cloud Connector Name must be 255 characters or less',
        }
      );
    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const formatError = validateFormat(newValue);

    onChange(newValue, !formatError, formatError);
  };

  const error = validateFormat(value);

  return (
    <EuiFormRow
      label={i18n.translate(
        'securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudConnectorNameField.label',
        {
          defaultMessage: 'Cloud Connector Name',
        }
      )}
      isInvalid={!!error}
      error={error}
      fullWidth
    >
      <EuiFieldText
        value={value}
        onChange={handleChange}
        isInvalid={!!error}
        disabled={disabled}
        fullWidth
      />
    </EuiFormRow>
  );
};
