/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GCP_CREDENTIALS_TYPE } from '../constants';
import { TechnicalPreviewText } from '../common';

export const GcpCredentialTypeSelector = ({
  type,
  onChange,
  options,
  disabled = false,
}: {
  onChange(type: string): void;
  type: string;
  options: Array<{ value: string; text: string }>;
  disabled?: boolean;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.gcpCredentialTypeSelectorLabel',
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
        onChange(optionElem.target.value);
      }}
      append={type === GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS ? <TechnicalPreviewText /> : undefined}
      data-test-subj="gcpCredentialTypeSelector"
    />
  </EuiFormRow>
);
