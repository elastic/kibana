/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ } from '@kbn/cloud-security-posture-common';
import { i18n } from '@kbn/i18n';
import type { AzureCredentialsType } from '../types';

export const AzureCredentialTypeSelector = ({
  type,
  onChange,
  options,
}: {
  onChange(type: AzureCredentialsType): void;
  type: AzureCredentialsType;
  options: Array<{ value: string; text: string }>;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.azureCredentialTypeSelectorLabel',
      {
        defaultMessage: 'Preferred manual method',
      }
    )}
  >
    <EuiSelect
      fullWidth
      options={options}
      value={type}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AzureCredentialsType);
      }}
      data-test-subj={AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ}
    />
  </EuiFormRow>
);
