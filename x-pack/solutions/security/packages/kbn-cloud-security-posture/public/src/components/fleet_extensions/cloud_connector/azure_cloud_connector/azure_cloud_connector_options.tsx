/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiText } from '@elastic/eui';
import { AZURE_INPUT_FIELDS_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import type { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import type { CloudConnectorField } from '../types';

// Azure Cloud Connector field names
const AZURE_CLOUD_CONNECTOR_FIELD_NAMES = {
  TENANT_ID: 'azure.credentials.tenant_id',
  CLIENT_ID: 'azure.credentials.client_id',
  CLOUD_CONNECTOR_ID: 'azure_credentials_cloud_connector_id',
} as const;

const AZURE_CLOUD_CONNECTOR_FIELD_LABELS = {
  tenant_id: i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudConnector.azure.tenantIdLabel',
    {
      defaultMessage: 'Tenant ID',
    }
  ),
  client_id: i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudConnector.azure.clientIdLabel',
    {
      defaultMessage: 'Client ID',
    }
  ),
  cloud_connector_id: i18n.translate(
    'securitySolutionPackages.cloudSecurityPosture.cloudConnector.azure.cloudConnectorIdLabel',
    {
      defaultMessage: 'Cloud Connector ID',
    }
  ),
};

interface AzureCloudConnectorOptions {
  id: string;
  label: string;
  type: 'text' | 'password';
  dataTestSubj: string;
  isSecret?: boolean;
  value: string;
}

// Define field sequence order
const FIELD_SEQUENCE = [
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID,
  AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLOUD_CONNECTOR_ID,
] as const;

export const getAzureCloudConnectorsCredentialsFormOptions = (
  inputVars?: PackagePolicyConfigRecord | undefined
) => {
  if (!inputVars) {
    return;
  }

  const fields: CloudConnectorField[] = [];

  // Create a map of all available fields
  const availableFields = new Map<string, AzureCloudConnectorOptions>();

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID]) {
    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.tenant_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.TENANT_ID,
      isSecret: true,
      value: inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID].value,
    });
  }

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID]) {
    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.client_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLIENT_ID,
      isSecret: true,
      value: inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID].value,
    });
  }

  if (inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLOUD_CONNECTOR_ID]) {
    availableFields.set(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLOUD_CONNECTOR_ID, {
      id: AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLOUD_CONNECTOR_ID,
      label: AZURE_CLOUD_CONNECTOR_FIELD_LABELS.cloud_connector_id,
      type: 'text' as const,
      dataTestSubj: AZURE_INPUT_FIELDS_TEST_SUBJECTS.CLOUD_CONNECTOR_ID,
      value: inputVars[AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLOUD_CONNECTOR_ID].value,
    });
  }

  // Add fields in the defined sequence if they are available
  for (const fieldName of FIELD_SEQUENCE) {
    const field = availableFields.get(fieldName);
    if (field) {
      fields.push(field);
    }
  }

  return {
    provider: 'azure' as const,
    fields,
    description: (
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnector.azure.description"
          defaultMessage="Configure Azure Cloud Connector credentials to securely connect to your Azure resources. The Cloud Connector will use these credentials to authenticate and collect security posture data."
        />
      </EuiText>
    ),
  };
};
