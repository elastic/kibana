/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type { PackagePolicyConfigRecord } from '@kbn/fleet-plugin/public/types';
import type { UpdatePolicy } from '../../types';
import type {
  CloudConnectorCredentials,
  AwsCloudConnectorCredentials,
  AzureCloudConnectorCredentials,
} from '../types';
import { updateInputVarsWithCredentials, updatePolicyInputs } from '../utils';
import { AWS_CLOUD_CONNECTOR_FIELD_NAMES, AZURE_CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';

export interface UseCloudConnectorSetupReturn {
  // State for new connection form
  newConnectionCredentials: CloudConnectorCredentials;
  setNewConnectionCredentials: (credentials: CloudConnectorCredentials) => void;

  // State for existing connection form
  existingConnectionCredentials: CloudConnectorCredentials;
  setExistingConnectionCredentials: (credentials: CloudConnectorCredentials) => void;

  // Update policy callbacks
  updatePolicyWithNewCredentials: (credentials: CloudConnectorCredentials) => void;
  updatePolicyWithExistingCredentials: (credentials: CloudConnectorCredentials) => void;
}

const getFieldNamesIfExists = (inputVars: PackagePolicyConfigRecord) => {
  // Helper function to find field name using constants first, then fallback to string search
  const findFieldName = (constantName: string, fallbackSearchTerms: string[]) => {
    // First try to find using the constant field name
    if (inputVars[constantName]) {
      return constantName;
    }

    // Fallback to searching by terms if constant field not found
    return Object.keys(inputVars).find((key) =>
      fallbackSearchTerms.some((term) => key.toLowerCase().includes(term.toLowerCase()))
    );
  };

  // AWS field names - use constants first, fallback to string search
  const roleArnFieldName = findFieldName(AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN, [
    'role_arn',
    AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN,
  ]);

  const externalIdFieldName = findFieldName(AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID, [
    'external_id',
    AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID,
  ]);

  // Azure field names - use constants first, fallback to string search
  const tenantIdFieldName = findFieldName(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID, [
    'tenant_id',
  ]);

  const clientIdFieldName = findFieldName(AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID, [
    'client_id',
  ]);

  const azureCloudConnectorIdFieldName = findFieldName(
    AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID,
    ['azure_credentials_cloud_connector_id']
  );

  return {
    roleArnFieldName,
    externalIdFieldName,
    tenantIdFieldName,
    clientIdFieldName,
    azureCloudConnectorIdFieldName,
  };
};

// Helper function to create initial credentials based on existing vars
const createInitialCredentials = (vars: PackagePolicyConfigRecord): CloudConnectorCredentials => {
  const fieldNames = getFieldNamesIfExists(vars);

  // Determine provider type based on which fields exist
  const isAzureProvider = fieldNames.tenantIdFieldName || fieldNames.clientIdFieldName;

  if (isAzureProvider) {
    return {
      tenantId: fieldNames.tenantIdFieldName
        ? vars[fieldNames.tenantIdFieldName]?.value
        : undefined,
      clientId: fieldNames.clientIdFieldName
        ? vars[fieldNames.clientIdFieldName]?.value
        : undefined,
      azure_credentials_cloud_connector_id: fieldNames.azureCloudConnectorIdFieldName
        ? vars[fieldNames.azureCloudConnectorIdFieldName]?.value
        : undefined,
    } as AzureCloudConnectorCredentials;
  }

  // Default to AWS credentials
  return {
    roleArn: fieldNames.roleArnFieldName ? vars[fieldNames.roleArnFieldName]?.value : undefined,
    externalId: fieldNames.externalIdFieldName
      ? vars[fieldNames.externalIdFieldName]?.value
      : undefined,
  } as AwsCloudConnectorCredentials;
};

export const useCloudConnectorSetup = (
  input: NewPackagePolicyInput,
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy
): UseCloudConnectorSetupReturn => {
  // State for new connection form - initialize based on existing vars
  const [newConnectionCredentials, setNewConnectionCredentials] =
    useState<CloudConnectorCredentials>(() => {
      const vars = input.streams[0]?.vars ?? {};
      return createInitialCredentials(vars);
    });

  // State for existing connection form - initialize as empty object to be populated based on provider
  const [existingConnectionCredentials, setExistingConnectionCredentials] =
    useState<CloudConnectorCredentials>({});

  // Update policy with new connection credentials
  const updatePolicyWithNewCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      const updatedPolicy = { ...newPolicy };
      const inputVars = input.streams.find((i) => i.enabled)?.vars;

      // Handle undefined cases safely
      const updatedInputVars = updateInputVarsWithCredentials(
        inputVars as PackagePolicyConfigRecord,
        credentials
      );
      setNewConnectionCredentials(credentials);

      // Apply updatedVars to the policy using utility function
      if (inputVars) {
        const updatedPolicyWithInputs = updatePolicyInputs(
          updatedPolicy,
          updatedInputVars as PackagePolicyConfigRecord
        );
        updatePolicy({
          updatedPolicy: { ...updatedPolicyWithInputs, cloud_connector_id: undefined },
        });
      }
    },
    [input.streams, newPolicy, updatePolicy]
  );

  // Update policy with existing connection credentials
  const updatePolicyWithExistingCredentials = useCallback(
    (credentials: CloudConnectorCredentials) => {
      const updatedPolicy = { ...newPolicy };
      const inputVars = input.streams.find((i) => i.enabled)?.vars;

      // Handle undefined cases safely
      const updatedInputVars = updateInputVarsWithCredentials(
        inputVars as PackagePolicyConfigRecord,
        credentials
      );
      // Update existing connection credentials state
      setExistingConnectionCredentials(credentials);

      // Apply updatedVars to the policy
      if (inputVars) {
        const updatedPolicyWithInputs = updatePolicyInputs(
          updatedPolicy,
          updatedInputVars as PackagePolicyConfigRecord
        );
        updatedPolicy.inputs = updatedPolicyWithInputs.inputs;
      }
      // Set cloud_connector_id based on credential type
      if ('cloudConnectorId' in credentials && credentials.cloudConnectorId) {
        updatedPolicy.cloud_connector_id = credentials.cloudConnectorId;
      } else if (
        'azure_credentials_cloud_connector_id' in credentials &&
        credentials.azure_credentials_cloud_connector_id
      ) {
        updatedPolicy.cloud_connector_id = credentials.azure_credentials_cloud_connector_id;
      }

      updatePolicy({ updatedPolicy });
    },
    [input.streams, newPolicy, updatePolicy]
  );

  return {
    newConnectionCredentials,
    setNewConnectionCredentials,
    existingConnectionCredentials,
    setExistingConnectionCredentials,
    updatePolicyWithNewCredentials,
    updatePolicyWithExistingCredentials,
  };
};
