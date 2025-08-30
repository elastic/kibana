/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
import type { CloudConnectorOption, ComboBoxOption } from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import type { CloudConnectorCredentials } from '../hooks/use_cloud_connector_setup';

export const AWSReusableConnectorForm: React.FC<{
  credentials: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials }) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors();

  // Convert cloud connectors to combo box options (only standard properties for EuiComboBox)
  const comboBoxOptions: ComboBoxOption[] = cloudConnectors.map((connector) => ({
    label: connector.name,
    value: connector.id, // Use ID as value for easier lookup
  }));

  // Keep full connector data for reference
  const cloudConnectorData: CloudConnectorOption[] = cloudConnectors.map((connector) => ({
    label: connector.name,
    value: connector.id,
    id: connector.id,
    roleArn: connector.vars.role_arn || connector.vars['aws.role_arn'],
    externalId: connector.vars['aws.credentials.external_id'] || connector.vars.external_id,
  }));

  // Find the currently selected connector based on credentials
  const selectedConnector = credentials?.cloudConnectorId
    ? comboBoxOptions.find((opt) => opt.value === credentials.cloudConnectorId) || null
    : null;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="cloudFormation.cloudConnectorInstructions"
          defaultMessage="To streamline your AWS integration process, you can reuse the same Role ARN for different use cases within Elastic. Simply choose the existing Role ARN from the options below:"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label="Role ARN" fullWidth>
        <EuiComboBox
          aria-label="Select Role ARN"
          placeholder="Select a Role ARN"
          options={comboBoxOptions}
          fullWidth
          singleSelection={true}
          selectedOptions={selectedConnector ? [selectedConnector] : []}
          onChange={(selected) => {
            const [selectedOption] = selected;

            if (selectedOption) {
              const connector = cloudConnectorData.find((opt) => opt.id === selectedOption.value);
              if (connector?.roleArn && connector?.externalId) {
                setCredentials({
                  roleArn: connector.roleArn,
                  externalId: connector.externalId,
                  cloudConnectorId: connector.id,
                });
              }
            } else {
              setCredentials({
                roleArn: undefined,
                externalId: undefined,
                cloudConnectorId: undefined,
              });
            }
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
};
