/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import type { ComboBoxOption, AzureCloudConnectorCredentials } from '../types';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';

// Azure-specific cloud connector vars interface (extending Fleet's CloudConnectorVars)
interface AzureCloudConnectorVars extends Record<string, unknown> {
  'azure.credentials.tenant_id'?: { value: string };
  'azure.credentials.client_id'?: { value: string };
  tenant_id?: { value: string };
  client_id?: { value: string };
}

// Azure-specific cloud connector option interface
interface AzureCloudConnectorOption {
  label: string;
  value: string;
  id: string;
  tenantId?: { value: string };
  clientId?: { value: string };
}

export const AzureReusableConnectorForm: React.FC<{
  cloudConnectorId: string | undefined;
  isEditPage: boolean;
  credentials: AzureCloudConnectorCredentials;
  setCredentials: (credentials: AzureCloudConnectorCredentials) => void;
}> = ({ credentials, setCredentials, isEditPage, cloudConnectorId }) => {
  const { data: cloudConnectors = [] } = useGetCloudConnectors();

  // Filter Azure cloud connectors only - check for Azure-specific variables
  const azureConnectors = cloudConnectors.filter((connector) => {
    const vars = connector.vars as AzureCloudConnectorVars;
    return (
      vars &&
      (vars['azure.credentials.tenant_id'] || vars.tenant_id) &&
      (vars['azure.credentials.client_id'] || vars.client_id)
    );
  });

  // Convert cloud connectors to combo box options (only standard properties for EuiComboBox)
  const comboBoxOptions: ComboBoxOption[] = azureConnectors.map((connector) => ({
    label: connector.name,
    value: connector.id, // Use ID as value for easier lookup
  }));

  // Keep full connector data for reference
  const cloudConnectorData: AzureCloudConnectorOption[] = azureConnectors.map((connector) => {
    // Check for both possible Azure credential field names
    const vars = connector.vars as AzureCloudConnectorVars;
    const tenantId = vars['azure.credentials.tenant_id'] || vars.tenant_id;
    const clientId = vars['azure.credentials.client_id'] || vars.client_id;

    return {
      label: connector.name,
      value: connector.id,
      id: connector.id,
      tenantId,
      clientId,
    };
  });

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
        if (connector?.tenantId && connector?.clientId) {
          setCredentials({
            ...credentials,
            tenantId: connector.tenantId.value,
            clientId: connector.clientId.value,
            cloudConnectorId: connector.id,
          });
        }
      } else {
        setCredentials({
          ...credentials,
          tenantId: undefined,
          clientId: undefined,
          cloudConnectorId: undefined,
        });
      }
    },
    [cloudConnectorData, setCredentials, credentials]
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
