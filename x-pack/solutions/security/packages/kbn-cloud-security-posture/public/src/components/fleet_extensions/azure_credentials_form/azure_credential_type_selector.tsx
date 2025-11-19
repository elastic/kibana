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
import { TechnicalPreviewText } from '../common';

export const AzureCredentialTypeSelector = ({
  type,
  onChange,
  options,
  disabled = false,
}: {
  onChange(type: AzureCredentialsType): void;
  type: AzureCredentialsType;
  options: Array<{ value: string; text: string }>;
  disabled?: boolean;
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
      disabled={disabled}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AzureCredentialsType);
      }}
      append={type === 'cloud_connectors' ? <TechnicalPreviewText /> : undefined}
      data-test-subj={AZURE_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ}
    />
  </EuiFormRow>
);
