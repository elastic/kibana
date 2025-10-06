/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { CloudConnectorOption, ComboBoxOption } from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import type { CloudConnectorCredentials } from '../hooks/use_cloud_connector_setup';

export const AWSReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: CloudConnectorCredentials;
  setCredentials: (credentials: CloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId }) => {
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
    roleArn: connector.vars.role_arn,
    externalId: connector.vars.external_id,
  }));

  // Find the currently selected connector based on credentials
  const selectedConnector = useMemo(() => {
    return (isEditPage && cloudConnectorId) || credentials?.cloudConnectorId
      ? comboBoxOptions.find(
          (opt) => opt.value === credentials.cloudConnectorId || opt.value === cloudConnectorId
        ) || null
      : null;
  }, [isEditPage, cloudConnectorId, credentials?.cloudConnectorId, comboBoxOptions]);

  const handleConnectorChange = useCallback(
    (selected: Array<{ label: string; value?: string }>) => {
      const [selectedOption] = selected;

      if (selectedOption?.value) {
        const connector = cloudConnectorData.find((opt) => opt.id === selectedOption.value);
        if (connector?.roleArn && connector?.externalId) {
          setCredentials({
            roleArn: connector.roleArn.value,
            externalId: connector.externalId.value,
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
    },
    [cloudConnectorData, setCredentials]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.cloudFormation.cloudConnectorInstructions"
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
          onChange={handleConnectorChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
};
