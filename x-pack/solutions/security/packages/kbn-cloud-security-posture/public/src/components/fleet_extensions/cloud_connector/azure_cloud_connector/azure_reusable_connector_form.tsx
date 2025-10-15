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
  ComboBoxOption,
  AzureCloudConnectorCredentials,
  AzureCloudConnectorOption,
} from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { isAzureCloudConnectorVars } from '../utils';
import { AZURE_PROVIDER } from '../constants';

export const AzureReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AzureCloudConnectorCredentials;
  setCredentials: (credentials: AzureCloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId }) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors();

  const azureCloudConnectorData: AzureCloudConnectorOption[] = useMemo(() => {
    return cloudConnectors
      .filter((connector) => isAzureCloudConnectorVars(connector.vars, AZURE_PROVIDER))
      .map((connector) => {
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
  const comboBoxOptions: ComboBoxOption[] = azureCloudConnectorData.map((connector) => ({
    label: connector.label,
    value: connector.value,
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
        const connector = azureCloudConnectorData.find((opt) => opt.id === selectedOption.value);
        if (
          connector?.tenantId &&
          connector?.clientId &&
          connector?.azure_credentials_cloud_connector_id
        ) {
          // Extract string values safely to avoid circular references
          const tenantIdValue =
            typeof connector.tenantId?.value?.id === 'string'
              ? connector.tenantId.value.id
              : undefined;
          const clientIdValue =
            typeof connector.clientId?.value?.id === 'string'
              ? connector.clientId.value.id
              : undefined;
          const azureConnectorIdValue =
            typeof connector.azure_credentials_cloud_connector_id?.value?.id === 'string'
              ? connector.azure_credentials_cloud_connector_id.value.id
              : undefined;

          setCredentials({
            tenantId: tenantIdValue,
            clientId: clientIdValue,
            azure_credentials_cloud_connector_id: azureConnectorIdValue,
            cloudConnectorId: connector.id,
          });
        }
      } else {
        // Handle deselection
        setCredentials({
          ...credentials,
          tenantId: undefined,
          clientId: undefined,
          cloudConnectorId: undefined,
        });
      }
    },
    [azureCloudConnectorData, setCredentials, credentials]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.armTemplate.cloudConnectorInstructions"
          defaultMessage="To streamline your Azure integration process, you can reuse the same credentials for different use cases within Elastic. Simply choose the existing credentials from the options below:"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label="Azure Credentials" fullWidth>
        <EuiComboBox
          aria-label="Select Azure Credentials"
          placeholder="Select Azure credentials"
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
