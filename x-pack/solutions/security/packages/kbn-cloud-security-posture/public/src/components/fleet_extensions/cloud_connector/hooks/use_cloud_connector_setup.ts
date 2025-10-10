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
  const roleArnFieldName = Object.keys(inputVars).find((key) => key.toLowerCase() === 'role_arn');
  const externalIdFieldName = Object.keys(inputVars).find((key) =>
    key.toLowerCase().includes('external_id')
  );
  const tenantIdFieldName = Object.keys(inputVars).find((key) =>
    key.toLowerCase().includes('tenant_id')
  );
  const clientIdFieldName = Object.keys(inputVars).find((key) =>
    key.toLowerCase().includes('client_id')
  );
  const azureCloudConnectorIdFieldName = Object.keys(inputVars).find((key) =>
    key.toLowerCase().includes('azure_credentials_cloud_connector_id')
  );

  return {
    roleArnFieldName,
    externalIdFieldName,
    tenantIdFieldName,
    clientIdFieldName,
    azureCloudConnectorIdFieldName,
  };
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
      const {
        roleArnFieldName,
        externalIdFieldName,
        tenantIdFieldName,
        clientIdFieldName,
        azureCloudConnectorIdFieldName,
      } = getFieldNamesIfExists(vars);

      // Check if this appears to be AWS or Azure based on existing vars
      const hasAwsFields = roleArnFieldName || externalIdFieldName;
      const hasAzureFields =
        tenantIdFieldName || clientIdFieldName || azureCloudConnectorIdFieldName;

      if (hasAzureFields && !hasAwsFields) {
        // Initialize as Azure credentials
        return {
          tenantId: tenantIdFieldName ? vars[tenantIdFieldName]?.value : undefined,
          clientId: clientIdFieldName ? vars[clientIdFieldName]?.value : undefined,
          azure_credentials_cloud_connector_id: azureCloudConnectorIdFieldName
            ? vars[azureCloudConnectorIdFieldName]?.value
            : undefined,
        } as AzureCloudConnectorCredentials;
      } else {
        // Default to AWS credentials
        return {
          roleArn: roleArnFieldName ? vars[roleArnFieldName]?.value : undefined,
          externalId: externalIdFieldName ? vars[externalIdFieldName]?.value : undefined,
        } as AwsCloudConnectorCredentials;
      }
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
