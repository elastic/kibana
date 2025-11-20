/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { AzureCloudConnectorVars } from '@kbn/fleet-plugin/common/types';
import type {
  AzureCloudConnectorCredentials,
  AzureCloudConnectorOption,
  ComboBoxOption,
} from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { AZURE_PROVIDER } from '../constants';

export const AzureReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AzureCloudConnectorCredentials;
  setCredentials: (credentials: AzureCloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId }) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors(AZURE_PROVIDER);

  // Map connectors to Azure format
  const azureConnectionData: AzureCloudConnectorOption[] = useMemo(() => {
    return cloudConnectors.map((connector) => {
      const azureVars = connector.vars as AzureCloudConnectorVars;
      return {
        label: connector.name,
        value: connector.id,
        id: connector.id,
        tenantId: azureVars.tenant_id,
        clientId: azureVars.client_id,
        azure_credentials_cloud_connector_id: azureVars.azure_credentials_cloud_connector_id,
      };
    });
  }, [cloudConnectors]);

  // Convert cloud connectors to combo box options (only standard properties for EuiComboBox)
  const comboBoxOptions: ComboBoxOption[] = useMemo(
    () =>
      azureConnectionData.map((connector) => ({
        label: connector.label,
        value: connector.value,
      })),
    [azureConnectionData]
  );

  // Find the currently selected connector based on credentials
  const selectedConnector = useMemo(() => {
    const targetId = cloudConnectorId || credentials?.cloudConnectorId;
    return targetId ? comboBoxOptions.find((opt) => opt.value === targetId) || null : null;
  }, [cloudConnectorId, credentials?.cloudConnectorId, comboBoxOptions]);

  const handleConnectorChange = useCallback(
    (selected: Array<{ label: string; value?: string }>) => {
      const [selectedOption] = selected;

      if (selectedOption?.value) {
        const connector = azureConnectionData.find((opt) => opt.id === selectedOption.value);

        if (
          connector?.tenantId?.value &&
          connector?.clientId?.value &&
          connector?.azure_credentials_cloud_connector_id?.value
        ) {
          setCredentials({
            tenantId: connector.tenantId.value,
            clientId: connector.clientId.value,
            azure_credentials_cloud_connector_id:
              connector.azure_credentials_cloud_connector_id.value,
            cloudConnectorId: connector.id, // Store the cloud connector ID for selection
          });
        }
      } else {
        // Handle deselection
        setCredentials({
          tenantId: undefined,
          clientId: undefined,
          azure_credentials_cloud_connector_id: undefined,
          cloudConnectorId: undefined,
        });
      }
    },
    [azureConnectionData, setCredentials]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.azure.cloudConnectorInstructions"
          defaultMessage="To streamline your Azure integration process, you can reuse the same cloud connector for different use cases within Elastic. Simply choose the existing connection from the options below:"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.azure.cloudConnectorLabel"
            defaultMessage="Azure Cloud Connector"
          />
        }
        fullWidth
      >
        <EuiComboBox
          aria-label="Select Azure Cloud Connector"
          placeholder="Select a cloud connector"
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
