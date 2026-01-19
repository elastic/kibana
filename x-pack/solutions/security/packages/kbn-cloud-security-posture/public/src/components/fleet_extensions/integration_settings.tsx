/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';

interface IntegrationInfoFieldsProps {
  newPolicy: NewPackagePolicy;
  validationResults?: PackagePolicyValidationResults;
  onChange(field: string, value: string): void;
}

export const IntegrationSettings = ({
  onChange,
  newPolicy,
  validationResults,
}: IntegrationInfoFieldsProps) => {
  const integrationFields = useMemo(
    () => [
      {
        id: 'name',
        value: newPolicy.name,
        error: validationResults?.name || null,
        label: (
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.integrationNameLabel"
            defaultMessage="Name"
          />
        ),
      },
      {
        id: 'description',
        value: newPolicy.description || '',
        error: validationResults?.description || null,
        label: (
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.integrationDescriptionLabel"
            defaultMessage="Description"
          />
        ),
      },
    ],
    [newPolicy.name, newPolicy.description, validationResults]
  );
  return (
    <div>
      {integrationFields.map(({ value, id, label, error }) => (
        <EuiFormRow key={id} id={id} fullWidth label={label} isInvalid={!!error} error={error}>
          <EuiFieldText
            isInvalid={!!error}
            fullWidth
            value={value}
            onChange={(event) => onChange(id, event.target.value)}
          />
        </EuiFormRow>
      ))}
    </div>
  );
};
